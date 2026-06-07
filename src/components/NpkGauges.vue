<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { useDashboardStore } from '@/stores/dashboard'

use([GaugeChart, CanvasRenderer])

const store = useDashboardStore()

const displayData = computed(() => {
  const d = store.displayReading
  return {
    nitrogen: d?.nitrogen ?? 0,
    phosphorus: d?.phosphorus ?? 0,
    potassium: d?.potassium ?? 0,
  }
})

function makeGaugeOption(name: string, value: number, color: string, threshold: number) {
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '90%',
        center: ['50%', '65%'],
        progress: {
          show: true,
          width: 10,
          itemStyle: { color },
        },
        axisLine: {
          lineStyle: {
            width: 10,
            color: [[1, '#1A3B34']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: {
          show: true,
          offsetCenter: [0, '30%'],
          fontSize: 12,
          color: '#8BA89E',
          fontFamily: 'Noto Sans SC',
        },
        detail: {
          valueAnimation: true,
          fontSize: 20,
          fontWeight: 600,
          fontFamily: 'JetBrains Mono',
          offsetCenter: [0, '5%'],
          formatter: `{value}`,
          color: '#F0F0F0',
        },
        data: [{ value: Math.round(value * 10) / 10, name }],
        markLine: {
          silent: true,
          lineStyle: {
            color: '#E74C3C',
            type: 'dashed',
            width: 1,
          },
          data: [{ xAxis: threshold }],
          symbol: 'none',
          label: { show: false },
        },
      },
    ],
  }
}

const nitrogenOption = computed(() =>
  makeGaugeOption('氮(N)', displayData.value.nitrogen, '#2ECC71', 80)
)
const phosphorusOption = computed(() =>
  makeGaugeOption('磷(P)', displayData.value.phosphorus, '#D4A843', 60)
)
const potassiumOption = computed(() =>
  makeGaugeOption('钾(K)', displayData.value.potassium, '#E74C3C', 50)
)
</script>

<template>
  <div class="npk-gauges card">
    <div class="gauge-title">NPK 养分指标 <span class="unit">mg/kg</span></div>
    <div class="gauges-row">
      <div class="gauge-item">
        <VChart :option="nitrogenOption" autoresize class="gauge-chart" />
      </div>
      <div class="gauge-item">
        <VChart :option="phosphorusOption" autoresize class="gauge-chart" />
      </div>
      <div class="gauge-item">
        <VChart :option="potassiumOption" autoresize class="gauge-chart" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.npk-gauges {
  padding: 12px;
}

.gauge-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.unit {
  font-family: var(--font-data);
  font-size: 11px;
  color: var(--accent);
  margin-left: 8px;
}

.gauges-row {
  display: flex;
  justify-content: space-around;
}

.gauge-item {
  flex: 1;
}

.gauge-chart {
  width: 100%;
  height: 120px;
}
</style>
