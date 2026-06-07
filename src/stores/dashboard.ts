import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface SensorReading {
  probeId: string
  nitrogen: number
  phosphorus: number
  potassium: number
  temperature: number
  moisture: number
  conductivity: number
  lat: number
  lng: number
  timestamp: number
}

export interface AggregatedReading {
  avgNitrogen: number
  avgPhosphorus: number
  avgPotassium: number
  avgTemperature: number
  avgMoisture: number
  avgConductivity: number
  timestamp: number
}

export interface OnlineStats {
  online: number
  offline: number
  total: number
}

export interface Alert {
  id: string
  type: string
  probeId: string
  message: string
  level: 'warning' | 'critical' | 'info'
  timestamp: number
}

export interface ProbeInfo {
  id: string
  fieldId: string
  lat: number
  lng: number
  lastSeen: string | null
  latestReading: SensorReading | null
  online: boolean
}

export const useDashboardStore = defineStore('dashboard', () => {
  const readings = ref<Map<string, SensorReading>>(new Map())
  const aggregatedReadings = ref<AggregatedReading[]>([])
  const onlineStats = ref<OnlineStats>({ online: 0, offline: 0, total: 0 })
  const alerts = ref<Alert[]>([])
  const selectedProbe = ref<string | null>(null)
  const wsConnected = ref(false)
  const probeRegistry = ref<Map<string, ProbeInfo>>(new Map())
  const fieldGeoJson = ref<GeoJSON.FeatureCollection | null>(null)

  const currentAggregated = computed(() => {
    if (aggregatedReadings.value.length === 0) {
      return {
        avgNitrogen: 0,
        avgPhosphorus: 0,
        avgPotassium: 0,
        avgTemperature: 0,
        avgMoisture: 0,
        avgConductivity: 0,
        timestamp: 0,
      }
    }
    return aggregatedReadings.value[aggregatedReadings.value.length - 1]
  })

  const selectedReading = computed(() => {
    if (!selectedProbe.value) return null
    return readings.value.get(selectedProbe.value) ?? null
  })

  const displayReading = computed(() => {
    if (selectedReading.value) return selectedReading.value
    const agg = currentAggregated.value
    return {
      probeId: 'farm-avg',
      nitrogen: agg.avgNitrogen,
      phosphorus: agg.avgPhosphorus,
      potassium: agg.avgPotassium,
      temperature: agg.avgTemperature,
      moisture: agg.avgMoisture,
      conductivity: agg.avgConductivity,
      lat: 0,
      lng: 0,
      timestamp: agg.timestamp,
    }
  })

  const trendData = computed(() => {
    return aggregatedReadings.value.slice(-30)
  })

  function getProbeLocation(probeId: string): { lat: number; lng: number } {
    const probe = probeRegistry.value.get(probeId)
    return probe ? { lat: probe.lat, lng: probe.lng } : { lat: 32.06, lng: 118.78 }
  }

  function handleLatest(data: Record<string, any>) {
    for (const [probeId, reading] of Object.entries(data)) {
      const loc = getProbeLocation(probeId)
      readings.value.set(probeId, {
        ...reading,
        probeId,
        lat: loc.lat,
        lng: loc.lng,
        timestamp: new Date(reading.timestamp).getTime(),
      })
    }
  }

  function handleAggregate(data: any) {
    if (data?.readings && Array.isArray(data.readings)) {
      for (const r of data.readings) {
        const loc = getProbeLocation(r.probeId)
        readings.value.set(r.probeId, {
          ...r,
          lat: loc.lat,
          lng: loc.lng,
          timestamp: new Date(r.timestamp).getTime(),
        })
      }
    }

    const allReadings = Array.from(readings.value.values())
    if (allReadings.length > 0) {
      aggregatedReadings.value.push({
        avgNitrogen: allReadings.reduce((s, r) => s + r.nitrogen, 0) / allReadings.length,
        avgPhosphorus: allReadings.reduce((s, r) => s + r.phosphorus, 0) / allReadings.length,
        avgPotassium: allReadings.reduce((s, r) => s + r.potassium, 0) / allReadings.length,
        avgTemperature: allReadings.reduce((s, r) => s + r.temperature, 0) / allReadings.length,
        avgMoisture: allReadings.reduce((s, r) => s + r.moisture, 0) / allReadings.length,
        avgConductivity: allReadings.reduce((s, r) => s + r.conductivity, 0) / allReadings.length,
        timestamp: Date.now(),
      })
    }

    if (aggregatedReadings.value.length > 120) {
      aggregatedReadings.value = aggregatedReadings.value.slice(-120)
    }
  }

  function handleAlert(data: any) {
    const level = data.type === 'OFFLINE' ? 'critical' : data.type === 'THRESHOLD_EXCEED' ? 'warning' : 'info'
    alerts.value.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: data.type,
      probeId: data.probeId,
      message: data.message,
      level,
      timestamp: new Date(data.timestamp).getTime(),
    })
  }

  function handleOnlineStats(data: OnlineStats) {
    onlineStats.value = data
  }

  function setProbeRegistry(probes: ProbeInfo[]) {
    const map = new Map<string, ProbeInfo>()
    for (const p of probes) {
      map.set(p.id, p)
    }
    probeRegistry.value = map
  }

  function setFieldGeoJson(geojson: GeoJSON.FeatureCollection) {
    fieldGeoJson.value = geojson
  }

  function removeAlert(id: string) {
    alerts.value = alerts.value.filter(a => a.id !== id)
  }

  function selectProbe(probeId: string | null) {
    selectedProbe.value = probeId
  }

  return {
    readings,
    aggregatedReadings,
    onlineStats,
    alerts,
    selectedProbe,
    wsConnected,
    probeRegistry,
    fieldGeoJson,
    currentAggregated,
    selectedReading,
    displayReading,
    trendData,
    handleLatest,
    handleAggregate,
    handleAlert,
    handleOnlineStats,
    setProbeRegistry,
    setFieldGeoJson,
    removeAlert,
    selectProbe,
  }
})
