<script setup lang="ts">
import NpkGauges from './NpkGauges.vue'
import TrendChart from './TrendChart.vue'
import OnlineStats from './OnlineStats.vue'
import MetricCards from './MetricCards.vue'
import VpdGauge from './VpdGauge.vue'
import ControlEventStream from './ControlEventStream.vue'
</script>

<template>
  <div class="data-panel">
    <VpdGauge />
    <ControlEventStream />
    <NpkGauges />
    <TrendChart />
    <div class="bottom-row">
      <OnlineStats />
      <MetricCards />
    </div>
  </div>
</template>

<style scoped>
.data-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
}

.bottom-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
</style>
