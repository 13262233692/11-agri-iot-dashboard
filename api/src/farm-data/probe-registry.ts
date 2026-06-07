import type { ProbeInfo } from '../types.js'

const probes: [string, string, number, number][] = [
  ['E01', 'field_east', 32.059, 118.793],
  ['E02', 'field_east', 32.059, 118.796],
  ['E03', 'field_east', 32.061, 118.798],
  ['E04', 'field_east', 32.063, 118.795],
  ['E05', 'field_east', 32.061, 118.792],
  ['W01', 'field_west', 32.058, 118.763],
  ['W02', 'field_west', 32.057, 118.767],
  ['W03', 'field_west', 32.062, 118.769],
  ['W04', 'field_west', 32.063, 118.764],
  ['S01', 'field_south', 32.044, 118.779],
  ['S02', 'field_south', 32.044, 118.782],
  ['S03', 'field_south', 32.047, 118.783],
  ['S04', 'field_south', 32.046, 118.778],
  ['N01', 'field_north', 32.073, 118.777],
  ['N02', 'field_north', 32.073, 118.782],
  ['N03', 'field_north', 32.077, 118.784],
  ['N04', 'field_north', 32.078, 118.778],
  ['C01', 'field_center', 32.059, 118.779],
  ['C02', 'field_center', 32.060, 118.781],
  ['C03', 'field_center', 32.062, 118.780],
]

export const PROBE_REGISTRY: Map<string, ProbeInfo> = new Map(
  probes.map(([id, fieldId, lat, lng]) => [
    id,
    { id, fieldId, lat, lng, lastSeen: null, latestReading: null, online: false },
  ]),
)

export function getProbeFieldId(probeId: string): string {
  const probe = PROBE_REGISTRY.get(probeId)
  return probe?.fieldId ?? 'unknown'
}
