<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { TitleComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useDashboardStore } from '@/stores/dashboard'

use([GaugeChart, CanvasRenderer, TitleComponent, TooltipComponent])

const store = useDashboardStore()

const vpdList = computed(() => {
  const list = Array.from(store.vpdReadings.values())
  return list.sort((a, b) => a.fieldId.localeCompare(b.fieldId))
})

const maxVpd = computed(() => {
  if (vpdList.value.length === 0) return 0
  return Math.max(...vpdList.value.map(v => v.vpd))
})

const FIELD_NAMES: Record<string, string> = {
  field_east: '东区水稻田',
  field_west: '西区小麦田',
  field_south: '南区蔬菜大棚',
  field_north: '北区果园',
  field_center: '中心试验区',
}

function getFieldName(fieldId: string): string {
  return FIELD_NAMES[fieldId] ?? fieldId
}

function getZoneColor(zone: string): string {
  if (zone === 'critical') return '#E74C3C'
  if (zone === 'caution') return '#F39C12'
  return '#2ECC71'
}

function getGaugeOption(vpd: number, zone: string) {
  return {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 4,
      splitNumber: 4,
      itemStyle: { color: getZoneColor(zone) },
      progress: {
        show: true,
        roundCap: true,
        width: 10,
      },
      pointer: {
        length: '55%',
        width: 4,
        itemStyle: { color: getZoneColor(zone) },
      },
      axisLine: {
        lineStyle: {
          width: 10,
          color: [
            [0.3, '#2ECC71'],
            [0.525, '#F39C12'],
            [1, '#E74C3C'],
          ],
        },
      },
      axisTick: { show: false },
      splitLine: {
        distance: -12,
        length: 6,
        lineStyle: { width: 1, color: '#8BA89E' },
      },
      axisLabel: {
        distance: 14,
        fontSize: 9,
        color: '#8BA89E',
        formatter: (v: number) => v.toFixed(1),
      },
      detail: {
        valueAnimation: true,
        fontSize: 16,
        fontFamily: 'JetBrains Mono, monospace',
        offsetCenter: [0, '70%'],
        formatter: '{value} kPa',
        color: getZoneColor(zone),
      },
      data: [{ value: Number(vpd.toFixed(2)) }],
    }],
  }
}
</script>

<template>
  <div class="vpd-panel">
    <div class="panel-title">VPD 饱和水汽压差</div>
    <div class="vpd-grid">
      <div v-for="vpd in vpdList" :key="vpd.fieldId" class="vpd-card">
        <div class="vpd-header">
          <span class="field-name">{{ getFieldName(vpd.fieldId) }}</span>
          <span class="zone-badge" :class="vpd.zone">{{ vpd.zone.toUpperCase() }}</span>
        </div>
        <VChart class="vpd-gauge" :option="getGaugeOption(vpd.vpd, vpd.zone)" autoresize />
        <div class="vpd-details">
          <div class="vpd-detail-row">
            <span class="label">T</span>
            <span class="value">{{ vpd.temperature.toFixed(1) }}°C</span>
          </div>
          <div class="vpd-detail-row">
            <span class="label">RH</span>
            <span class="value">{{ vpd.humidity.toFixed(1) }}%</span>
          </div>
          <div class="vpd-detail-row">
            <span class="label">SVP</span>
            <span class="value">{{ vpd.svp.toFixed(2) }} kPa</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vpd-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  padding: 8px 12px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.vpd-grid {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.vpd-card {
  min-width: 140px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.vpd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.field-name {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.zone-badge {
  font-size: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: var(--font-data);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.zone-badge.optimal {
  background: rgba(46, 204, 113, 0.15);
  color: #2ECC71;
}

.zone-badge.caution {
  background: rgba(243, 156, 18, 0.15);
  color: #F39C12;
}

.zone-badge.critical {
  background: rgba(231, 76, 60, 0.15);
  color: #E74C3C;
  animation: pulse-critical 1.5s ease-in-out infinite;
}

@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.vpd-gauge {
  width: 100%;
  height: 100px;
}

.vpd-details {
  display: flex;
  justify-content: space-around;
  margin-top: 2px;
}

.vpd-detail-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.vpd-detail-row .label {
  font-size: 8px;
  color: var(--text-secondary);
  font-family: var(--font-data);
}

.vpd-detail-row .value {
  font-size: 10px;
  color: var(--text-primary);
  font-family: var(--font-data);
}
</style>
