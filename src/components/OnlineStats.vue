<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphicComponent } from 'echarts/components'
import { useDashboardStore } from '@/stores/dashboard'

use([PieChart, CanvasRenderer, GraphicComponent])

const store = useDashboardStore()

const chartOption = computed(() => {
  const online = store.onlineStats.online
  const total = store.onlineStats.total
  const offline = total - online

  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: [
          {
            value: online,
            name: '在线',
            itemStyle: { color: '#2ECC71' },
          },
          {
            value: offline,
            name: '离线',
            itemStyle: { color: '#4A4A4A' },
          },
        ],
        emphasis: {
          scale: false,
        },
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: `${online}/${total} 在线`,
          fill: '#F0F0F0',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'JetBrains Mono',
          textAlign: 'center',
        },
      },
    ],
  }
})
</script>

<template>
  <div class="online-stats card">
    <div class="stat-title">探头状态</div>
    <VChart :option="chartOption" autoresize class="chart" />
  </div>
</template>

<style scoped>
.online-stats {
  padding: 12px;
}

.stat-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.chart {
  width: 100%;
  height: 120px;
}
</style>
