import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { MqttModule } from './mqtt/mqtt.module.js'
import { ParserModule } from './parser/parser.module.js'
import { InfluxDbModule } from './influxdb/influxdb.module.js'
import { WsGatewayModule } from './ws-gateway/ws-gateway.module.js'
import { AlertModule } from './alert/alert.module.js'
import { SensorModule } from './sensor/sensor.module.js'
import { SimulatorModule } from './simulator/simulator.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    ScheduleModule.forRoot(),
    MqttModule,
    ParserModule,
    InfluxDbModule,
    WsGatewayModule,
    AlertModule,
    SensorModule,
    SimulatorModule,
  ],
})
export class AppModule {}
