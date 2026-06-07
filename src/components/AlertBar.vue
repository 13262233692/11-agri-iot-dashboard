<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const visibleAlerts = ref<{ id: string; message: string; level: string; entering: boolean }[]>([])
let removeTimers = new Map<string, ReturnType<typeof setTimeout>>()

watch(
  () => store.alerts.length,
  () => {
    for (const alert of store.alerts) {
      if (!visibleAlerts.value.find(a => a.id === alert.id)) {
        visibleAlerts.value.push({
          id: alert.id,
          message: alert.message,
          level: alert.level,
          entering: true,
        })
        const timer = setTimeout(() => {
          store.removeAlert(alert.id)
          visibleAlerts.value = visibleAlerts.value.filter(a => a.id !== alert.id)
        }, 10000)
        removeTimers.set(alert.id, timer)
      }
    }
  },
  { deep: true }
)

onUnmounted(() => {
  for (const timer of removeTimers.values()) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <div class="alert-bar">
    <div v-if="visibleAlerts.length === 0" class="alert-normal">
      <span class="dot" />
      <span>系统运行正常</span>
    </div>
    <div v-else class="alert-scroll">
      <div v-for="alert in visibleAlerts" :key="alert.id" class="alert-item">
        <AlertTriangle :size="14" class="alert-icon" />
        <span>{{ alert.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-bar {
  width: 100%;
  height: 48px;
  background-color: var(--alert-bg);
  border-bottom: 1px solid #2A1515;
  display: flex;
  align-items: center;
  padding: 0 16px;
  overflow: hidden;
}

.alert-normal {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--success);
  font-size: 14px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--success);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.alert-scroll {
  display: flex;
  align-items: center;
  gap: 24px;
  animation: scroll-left 20s linear infinite;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--danger);
  font-size: 13px;
  white-space: nowrap;
  animation: fade-in 0.5s ease-out;
}

.alert-icon {
  flex-shrink: 0;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
