<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { useDashboardStore } from '@/stores/dashboard'

use([LineChart, CanvasRenderer, GridComponent, TooltipComponent, LegendComponent])

const store = useDashboardStore()

const chartOption = computed(() => {
  const data = store.trendData
  const timestamps = data.map(d => {
    const date = new Date(d.timestamp)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F2A25',
      borderColor: '#1A3B34',
      textStyle: { color: '#F0F0F0', fontSize: 11, fontFamily: 'JetBrains Mono' },
    },
    legend: {
      data: ['N', 'P', 'K'],
      top: 0,
      right: 0,
      textStyle: { color: '#8BA89E', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      top: 30,
      left: 40,
      right: 12,
      bottom: 24,
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      axisLine: { lineStyle: { color: '#1A3B34' } },
      axisLabel: { color: '#8BA89E', fontSize: 9, fontFamily: 'JetBrains Mono', interval: 4 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1A3B34', type: 'dashed' } },
      axisLabel: { color: '#8BA89E', fontSize: 9, fontFamily: 'JetBrains Mono' },
    },
    series: [
      {
        name: 'N',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#2ECC71' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(46,204,113,0.3)' }, { offset: 1, color: 'rgba(46,204,113,0.02)' }] } },
        data: data.map(d => Math.round(d.avgNitrogen * 10) / 10),
      },
      {
        name: 'P',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#D4A843' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(212,168,67,0.3)' }, { offset: 1, color: 'rgba(212,168,67,0.02)' }] } },
        data: data.map(d => Math.round(d.avgPhosphorus * 10) / 10),
      },
      {
        name: 'K',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#E74C3C' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(231,76,60,0.3)' }, { offset: 1, color: 'rgba(231,76,60,0.02)' }] } },
        data: data.map(d => Math.round(d.avgPotassium * 10) / 10),
      },
    ],
  }
})
</script>

<template>
  <div class="trend-chart card">
    <div class="chart-title">NPK 趋势 <span class="sub">近2.5h</span></div>
    <VChart :option="chartOption" autoresize class="chart" />
  </div>
</template>

<style scoped>
.trend-chart {
  padding: 12px;
}

.chart-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.sub {
  font-size: 11px;
  color: #5A7A70;
  margin-left: 6px;
}

.chart {
  width: 100%;
  height: 160px;
}
</style>
