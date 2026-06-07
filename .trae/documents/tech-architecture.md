## 1. 架构设计

```mermaid
graph TB
    subgraph "传感器层"
        "LoRa探针 x N"
    end

    subgraph "消息中间件"
        "EMQX MQTT Broker"
    end

    subgraph "后端服务 - NestJS"
        "MQTT Subscriber Service"
        "Hex Payload Parser"
        "InfluxDB Batch Writer"
        "WebSocket Gateway"
        "Aggregation Query Service"
        "Simulator Service"
    end

    subgraph "数据层"
        "InfluxDB 时序数据库"
    end

    subgraph "前端 - Vue3"
        "Leaflet + WebGL 热力图"
        "ECharts 仪表盘/曲线"
        "WebSocket Client"
    end

    "LoRa探针 x N" -->|"MQTT Publish<br/>topic: sensor/lora/{id}"| "EMQX MQTT Broker"
    "EMQX MQTT Broker" -->|"MQTT Subscribe"| "MQTT Subscriber Service"
    "MQTT Subscriber Service" -->|"原始Hex"| "Hex Payload Parser"
    "Hex Payload Parser" -->|"NPK/EC/Temp + ts"| "InfluxDB Batch Writer"
    "InfluxDB Batch Writer" -->|"批量写入"| "InfluxDB 时序数据库"
    "InfluxDB 时序数据库" -->|"5min聚合查询"| "Aggregation Query Service"
    "Aggregation Query Service" -->|"降采样数据"| "WebSocket Gateway"
    "WebSocket Gateway" -->|"WS Push"| "WebSocket Client"
    "Simulator Service" -->|"模拟探针数据"| "EMQX MQTT Broker"
    "WebSocket Client" -->|"数据驱动"| "Leaflet + WebGL 热力图"
    "WebSocket Client" -->|"数据驱动"| "ECharts 仪表盘/曲线"
```

## 2. 技术说明

- **前端**：Vue3 + TypeScript + Leaflet + ECharts + TailwindCSS + Vite
- **初始化工具**：Vite (vue-ts 模板)
- **后端**：NestJS + TypeScript (ESM)
- **数据库**：InfluxDB 2.x（时序数据库）
- **消息中间件**：EMQX（MQTT 5.0 Broker）
- **实时通信**：WebSocket（NestJS @WebSocketGateway）
- **模拟器**：NestJS 内置 Scheduler 定时向 EMQX 发布模拟 LoRa 探针数据

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 监控大屏主页面（热力图 + 仪表盘 + 告警 + 指标卡片） |

## 4. API 定义

### 4.1 WebSocket 事件

```typescript
interface SensorReading {
  probeId: string
  timestamp: string
  nitrogen: number
  phosphorus: number
  potassium: number
  conductivity: number
  temperature: number
}

interface AggregatedBatch {
  interval: string
  readings: SensorReading[]
}

interface AlertEvent {
  type: 'OFFLINE' | 'THRESHOLD_EXCEED' | 'DATA_ANOMALY'
  probeId: string
  message: string
  timestamp: string
}

type WSClientEvents = {
  'sensor:aggregate': (data: AggregatedBatch) => void
  'sensor:alert': (data: AlertEvent) => void
  'sensor:online-stats': (data: { online: number; offline: number; total: number }) => void
}
```

### 4.2 REST API

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/sensors` | 获取所有探针列表及最近状态 |
| GET | `/api/sensors/:id/history` | 查询指定探针历史数据（?start=&end=&interval=） |
| GET | `/api/farm/geojson` | 获取农场 GeoJSON 地块轮廓 |
| GET | `/api/farm/stats` | 获取农场级聚合统计 |

### 4.3 MQTT Topic 与载荷协议

**Topic 格式**：`sensor/lora/{probe_id}`

**Hex 载荷编码（12 字节 / 24 字符）**：

| 偏移 | 长度 | 字段 | 解码方式 |
|------|------|------|----------|
| 0-1 | 2 字节 | 氮 (N) | `uint16`, ÷10 → mg/kg |
| 2-3 | 2 字节 | 磷 (P) | `uint16`, ÷10 → mg/kg |
| 4-5 | 2 字节 | 钾 (K) | `uint16`, ÷10 → mg/kg |
| 6-7 | 2 字节 | 电导率 (EC) | `uint16`, ÷1 → μS/cm |
| 8-9 | 2 字节 | 温度 (Temp) | `int16`, ÷10 → °C |
| 10-11 | 2 字节 | 含水量 | `uint16`, ÷10 → % |

**示例**：`00320028004100F600FE01C0` → N=50, P=40, K=65, EC=246, T=25.4, H=28.0

## 5. 后端服务架构

```mermaid
graph LR
    subgraph "NestJS Modules"
        "MQTT Module" --> "Parser Module"
        "Parser Module" --> "InfluxDB Module"
        "InfluxDB Module" --> "WS Gateway Module"
        "InfluxDB Module" --> "Alert Module"
        "Sensor Module" --> "InfluxDB Module"
        "Simulator Module" --> "MQTT Module"
    end
```

### 核心模块职责

| 模块 | 职责 |
|------|------|
| MqttModule | 连接 EMQX，订阅 `sensor/lora/#`，接收原始 Hex 消息 |
| ParserModule | 将 Hex 字符串按位解包为 NPK/EC/Temp/湿度 结构化数据 |
| InfluxDbModule | 批量写入时序点，执行 5 分钟降采样聚合查询 |
| WsGatewayModule | WebSocket 服务端，定时推送聚合数据与告警 |
| AlertModule | 检测数据越限、探针离线等异常，生成告警事件 |
| SensorModule | REST API 提供探针列表、历史查询 |
| SimulatorModule | 定时器模拟 N 个 LoRa 探针向 EMQX 发布数据 |

## 6. 数据模型

### 6.1 InfluxDB Measurement 定义

**Measurement**: `soil_reading`

```influxql
-- Tag: 探针标识与地块
-- probe_id: string (tag) - 探针唯一ID
-- field_id: string (tag) - 所属地块ID

-- Field: 传感器数值
-- nitrogen: float (field) - 氮含量 mg/kg
-- phosphorus: float (field) - 磷含量 mg/kg
-- potassium: float (field) - 钾含量 mg/kg
-- conductivity: float (field) - 电导率 μS/cm
-- temperature: float (field) - 温度 °C
-- moisture: float (field) - 含水量 %
```

### 6.2 InfluxDB Flux 查询（5 分钟降采样）

```flux
from(bucket: "agri_iot")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "soil_reading")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> yield(name: "5min_avg")
```

### 6.3 GeoJSON 地块数据结构

```typescript
interface FarmField {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][] // [lng, lat] 多边形顶点
  }
  properties: {
    name: string
    crop: string
    area_hectares: number
    probe_ids: string[]
  }
}
```

## 7. 前端架构

### 7.1 核心组件树

```
Dashboard (大屏布局)
├── MapPanel (左侧60%)
│   ├── FarmMap (Leaflet 底图)
│   ├── FieldOverlay (GeoJSON 地块轮廓)
│   ├── HeatmapLayer (WebGL 热力图叠加)
│   └── ProbeMarkers (探针位置标注)
├── DataPanel (右侧40%)
│   ├── NpkGauges (NPK 仪表盘)
│   ├── TrendChart (5min 趋势曲线)
│   ├── OnlineStats (探针在线率)
│   ├── MetricCards (指标聚合卡片)
│   └── AlertBar (告警状态栏)
```

### 7.2 状态管理

```typescript
interface DashboardStore {
  readings: Map<string, SensorReading>
  aggregatedReadings: SensorReading[]
  onlineStats: { online: number; offline: number; total: number }
  alerts: AlertEvent[]
  selectedProbe: string | null
  selectedField: string | null
  wsConnected: boolean
}
```

### 7.3 热力图渲染策略

- 使用 Leaflet.heat 或自定义 WebGL 渲染层
- 每个探针坐标作为热力点，权重由 NPK 数值映射
- 接收到新数据时，通过插值过渡（lerp）实现 800ms 平滑渐变
- 色阶：深绿（低）→ 黄绿（中）→ 橙红（高），阈值可配置
- 使用 requestAnimationFrame + 双缓冲避免 UI 卡顿
