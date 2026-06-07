<script setup lang="ts">
import { computed } from 'vue'
import { Droplets, Power, PowerOff } from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()

const recentActions = computed(() => {
  return [...store.controlActions].reverse().slice(0, 15)
})

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getActionIcon(type: string) {
  return type === 'SOLENOID_OPEN' ? Power : PowerOff
}

function getActionColor(type: string): string {
  return type === 'SOLENOID_OPEN' ? '#E74C3C' : '#2ECC71'
}
</script>

<template>
  <div class="control-panel">
    <div class="panel-title">
      <Droplets :size="14" />
      <span>环控事件流</span>
    </div>
    <div class="solenoid-bar">
      <div v-for="(active, fieldId) in store.solenoidStates" :key="fieldId" class="solenoid-indicator" :class="{ active }">
        <span class="solenoid-dot" />
        <span class="solenoid-name">{{ fieldId.replace('field_', '') }}</span>
      </div>
    </div>
    <div class="event-list">
      <div v-if="recentActions.length === 0" class="empty-state">等待控制事件...</div>
      <div v-for="action in recentActions" :key="action.id" class="event-item">
        <component :is="getActionIcon(action.type)" :size="12" :style="{ color: getActionColor(action.type) }" />
        <div class="event-body">
          <div class="event-main">
            <span class="event-type" :class="action.type === 'SOLENOID_OPEN' ? 'open' : 'close'">
              {{ action.type === 'SOLENOID_OPEN' ? '开启' : '关闭' }}
            </span>
            <span class="event-field">{{ action.fieldName }}</span>
          </div>
          <div class="event-meta">
            <span>VPD={{ action.vpd.toFixed(2) }} kPa</span>
            <span>阈值={{ action.threshold }} kPa</span>
            <span>{{ formatTime(action.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

.solenoid-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-card);
}

.solenoid-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 10px;
  color: var(--text-secondary);
  font-family: var(--font-data);
  transition: all 0.3s ease;
}

.solenoid-indicator.active {
  background: rgba(231, 76, 60, 0.12);
  color: #E74C3C;
}

.solenoid-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: background 0.3s ease;
}

.solenoid-indicator.active .solenoid-dot {
  background: #E74C3C;
  box-shadow: 0 0 6px rgba(231, 76, 60, 0.6);
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.event-list {
  flex: 1;
  overflow-y: auto;
  max-height: 160px;
  min-height: 60px;
}

.empty-state {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  padding: 16px 0;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.event-body {
  flex: 1;
  min-width: 0;
}

.event-main {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.event-type {
  font-family: var(--font-data);
  font-weight: 700;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
}

.event-type.open {
  background: rgba(231, 76, 60, 0.15);
  color: #E74C3C;
}

.event-type.close {
  background: rgba(46, 204, 113, 0.15);
  color: #2ECC71;
}

.event-field {
  color: var(--text-primary);
  font-size: 11px;
}

.event-meta {
  display: flex;
  gap: 8px;
  font-size: 9px;
  color: var(--text-secondary);
  font-family: var(--font-data);
  margin-top: 2px;
}
</style>
