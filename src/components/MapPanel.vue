<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDashboardStore } from '@/stores/dashboard'
import { sensorValueToWeight, animateHeatmapTransition, type HeatmapPoint } from '@/utils/heatmap'

const store = useDashboardStore()
const mapContainer = ref<HTMLDivElement>()
let map: L.Map | null = null
let heatmapLayer: any = null
let markersLayer: L.LayerGroup | null = null
let geoJsonLayer: L.GeoJSON | null = null
let currentHeatmapPoints: HeatmapPoint[] = []
let cancelAnimation: (() => void) | null = null

function getNpkColor(nitrogen: number): string {
  if (nitrogen < 30) return '#2ECC71'
  if (nitrogen < 60) return '#D4A843'
  return '#E74C3C'
}

function createProbeMarker(probeId: string, lat: number, lng: number, nitrogen: number) {
  const color = getNpkColor(nitrogen)
  const marker = L.circleMarker([lat, lng], {
    radius: 6,
    fillColor: color,
    color: '#fff',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.9,
  })
  marker.on('click', () => {
    store.selectProbe(probeId)
  })
  marker.bindTooltip(probeId, {
    className: 'probe-tooltip',
    direction: 'top',
    offset: [0, -8],
  })
  return marker
}

function updateMarkers() {
  if (!markersLayer) return
  markersLayer.clearLayers()
  for (const [probeId, reading] of store.readings) {
    const marker = createProbeMarker(probeId, reading.lat, reading.lng, reading.nitrogen)
    markersLayer!.addLayer(marker)
  }
}

function updateHeatmap() {
  if (!heatmapLayer) return

  const newPoints: HeatmapPoint[] = []
  for (const reading of store.readings.values()) {
    newPoints.push({
      lat: reading.lat,
      lng: reading.lng,
      weight: sensorValueToWeight(reading.nitrogen, 0, 100),
    })
  }

  if (cancelAnimation) {
    cancelAnimation()
    cancelAnimation = null
  }

  cancelAnimation = animateHeatmapTransition(
    currentHeatmapPoints,
    newPoints,
    800,
    (interpolated) => {
      if (!heatmapLayer) return
      const latLngs = interpolated.map(p => [p.lat, p.lng, p.weight] as [number, number, number])
      heatmapLayer.setLatLngs(latLngs)
    },
    () => {
      currentHeatmapPoints = newPoints
      cancelAnimation = null
    }
  )
}

watch(() => store.readings.size, () => {
  updateMarkers()
  updateHeatmap()
})

watch(() => store.selectedProbe, (newVal) => {
  if (!map) return
  if (newVal) {
    const reading = store.readings.get(newVal)
    if (reading) {
      map.panTo([reading.lat, reading.lng], { animate: true, duration: 0.5 })
    }
  }
})

async function fetchFarmData() {
  try {
    const [geoRes, sensorRes] = await Promise.all([
      fetch('/api/farm/geojson'),
      fetch('/api/sensors'),
    ])
    if (geoRes.ok) {
      const geojson = await geoRes.json()
      store.setFieldGeoJson(geojson)
      if (geoJsonLayer && map) {
        geoJsonLayer.removeFrom(map)
      }
      if (map && geojson) {
        geoJsonLayer = L.geoJSON(geojson, {
          style: {
            color: '#D4A843',
            weight: 2,
            fillColor: '#D4A843',
            fillOpacity: 0.08,
            dashArray: '4 4',
          },
          onEachFeature(feature, layer) {
            if (feature.properties?.name) {
              layer.bindTooltip(feature.properties.name, {
                sticky: true,
                className: 'field-tooltip',
              })
            }
          },
        }).addTo(map)
      }
    }
    if (sensorRes.ok) {
      const sensors = await sensorRes.json()
      store.setProbeRegistry(sensors)
    }
  } catch {
    // silently handle fetch errors during startup
  }
}

onMounted(async () => {
  await nextTick()
  if (!mapContainer.value) return

  ;(window as any).L = L
  await import('leaflet.heat')

  map = L.map(mapContainer.value, {
    center: [32.06, 118.78],
    zoom: 15,
    zoomControl: false,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)

  // @ts-ignore
  heatmapLayer = L.heatLayer([], {
    radius: 40,
    blur: 30,
    maxZoom: 17,
    gradient: {
      0.2: '#0A4A2E',
      0.4: '#2ECC71',
      0.6: '#D4A843',
      0.8: '#E67E22',
      1.0: '#E74C3C',
    },
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  await fetchFarmData()

  setTimeout(() => map?.invalidateSize(), 100)
})

onUnmounted(() => {
  if (cancelAnimation) cancelAnimation()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-panel">
    <div ref="mapContainer" class="map-container" />
  </div>
</template>

<style scoped>
.map-panel {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

:deep(.probe-tooltip) {
  background: var(--bg-card) !important;
  border: 1px solid var(--border-card) !important;
  color: var(--text-primary) !important;
  font-family: var(--font-data) !important;
  font-size: 11px !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
}

:deep(.field-tooltip) {
  background: var(--bg-card) !important;
  border: 1px solid var(--accent) !important;
  color: var(--accent) !important;
  font-size: 12px !important;
  padding: 3px 8px !important;
  border-radius: 4px !important;
}

:deep(.leaflet-control-zoom) {
  border: 1px solid var(--border-card) !important;
}

:deep(.leaflet-control-zoom a) {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-card) !important;
}
</style>
