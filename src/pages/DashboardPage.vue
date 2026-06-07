<script setup lang="ts">
import { useWebSocket } from '@/composables/useWebSocket'
import AlertBar from '@/components/AlertBar.vue'
import MapPanel from '@/components/MapPanel.vue'
import DataPanel from '@/components/DataPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const { connected } = useWebSocket()
</script>

<template>
  <div class="dashboard">
    <AlertBar />
    <div class="dashboard-body">
      <div class="map-section">
        <MapPanel />
      </div>
      <div class="data-section">
        <DataPanel />
      </div>
    </div>
    <div class="ws-status" :class="{ online: connected, offline: !connected }">
      {{ connected ? 'WS已连接' : 'WS断开' }}
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-primary);
}

.dashboard-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.map-section {
  width: 60%;
  min-width: 0;
}

.data-section {
  width: 40%;
  min-width: 0;
  border-left: 1px solid var(--border-card);
}

.ws-status {
  position: fixed;
  bottom: 8px;
  left: 8px;
  font-size: 10px;
  font-family: var(--font-data);
  padding: 2px 8px;
  border-radius: 4px;
  z-index: 1000;
}

.ws-status.online {
  color: var(--success);
  background: rgba(46, 204, 113, 0.1);
}

.ws-status.offline {
  color: var(--danger);
  background: rgba(231, 76, 60, 0.1);
}
</style>
