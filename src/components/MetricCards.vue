<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent } from 'echarts/components'
import { Thermometer, Zap, Droplets, BarChart3 } from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard'

use([LineChart, CanvasRenderer, GridComponent])

const store = useDashboardStore()

const displayReading = computed(() => store.displayReading)

const trendData = computed(() => store.trendData)

function sparklineOption(values: number[], color: string) {
  return {
    backgroundColor: 'transparent',
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: values.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, color },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color.replace(')', ',0.4)').replace('rgb', 'rgba') }, { offset: 1, color: 'transparent' }] } },
      data: values.slice(-10),
    }],
  }
}

const tempSpark = computed(() => sparklineOption(trendData.value.map(d => d.avgTemperature), '#E74C3C'))
const condSpark = computed(() => sparklineOption(trendData.value.map(d => d.avgConductivity), '#D4A843'))
const moistSpark = computed(() => sparklineOption(trendData.value.map(d => d.avgMoisture), '#3498DB'))
const npkSpark = computed(() => {
  const avgNpk = trendData.value.map(d => (d.avgNitrogen + d.avgPhosphorus + d.avgPotassium) / 3)
  return sparklineOption(avgNpk, '#2ECC71')
})

const avgNpk = computed(() => {
  const d = displayReading.value
  if (!d) return 0
  return Math.round(((d.nitrogen + d.phosphorus + d.potassium) / 3) * 10) / 10
})
</script>

<template>
  <div class="metric-cards">
    <div class="card metric-card">
      <div class="card-header">
        <Thermometer :size="14" class="icon temp" />
        <span class="label">温度</span>
      </div>
      <div class="card-value">
        <span class="value data-font">{{ displayReading?.temperature?.toFixed(1) ?? '--' }}</span>
        <span class="unit">°C</span>
      </div>
      <VChart :option="tempSpark" autoresize class="sparkline" />
    </div>

    <div class="card metric-card">
      <div class="card-header">
        <Zap :size="14" class="icon cond" />
        <span class="label">电导率</span>
      </div>
      <div class="card-value">
        <span class="value data-font">{{ displayReading?.conductivity?.toFixed(0) ?? '--' }}</span>
        <span class="unit">μS/cm</span>
      </div>
      <VChart :option="condSpark" autoresize class="sparkline" />
    </div>

    <div class="card metric-card">
      <div class="card-header">
        <Droplets :size="14" class="icon moist" />
        <span class="label">湿度</span>
      </div>
      <div class="card-value">
        <span class="value data-font">{{ displayReading?.moisture?.toFixed(1) ?? '--' }}</span>
        <span class="unit">%</span>
      </div>
      <VChart :option="moistSpark" autoresize class="sparkline" />
    </div>

    <div class="card metric-card">
      <div class="card-header">
        <BarChart3 :size="14" class="icon npk" />
        <span class="label">平均NPK</span>
      </div>
      <div class="card-value">
        <span class="value data-font">{{ avgNpk }}</span>
        <span class="unit">mg/kg</span>
      </div>
      <VChart :option="npkSpark" autoresize class="sparkline" />
    </div>
  </div>
</template>

<style scoped>
.metric-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric-card {
  padding: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.label {
  font-size: 12px;
  color: var(--text-secondary);
}

.icon.temp { color: #E74C3C; }
.icon.cond { color: #D4A843; }
.icon.moist { color: #3498DB; }
.icon.npk { color: #2ECC71; }

.card-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.unit {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-data);
}

.sparkline {
  width: 100%;
  height: 30px;
}
</style>
