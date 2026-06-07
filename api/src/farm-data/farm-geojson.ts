import type { FarmFieldGeoJSON } from '../types.js'

export const FARM_FIELDS: FarmFieldGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'field_east',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [118.792, 32.058],
          [118.799, 32.057],
          [118.801, 32.061],
          [118.798, 32.064],
          [118.791, 32.063],
          [118.792, 32.058],
        ]],
      },
      properties: {
        name: '东区水稻田',
        crop: 'rice',
        area_hectares: 12.5,
        probe_ids: ['E01', 'E02', 'E03', 'E04', 'E05'],
      },
    },
    {
      type: 'Feature',
      id: 'field_west',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [118.761, 32.056],
          [118.769, 32.055],
          [118.771, 32.061],
          [118.768, 32.065],
          [118.762, 32.064],
          [118.761, 32.056],
        ]],
      },
      properties: {
        name: '西区小麦田',
        crop: 'wheat',
        area_hectares: 15.2,
        probe_ids: ['W01', 'W02', 'W03', 'W04'],
      },
    },
    {
      type: 'Feature',
      id: 'field_south',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [118.777, 32.043],
          [118.784, 32.042],
          [118.786, 32.046],
          [118.782, 32.048],
          [118.776, 32.047],
          [118.777, 32.043],
        ]],
      },
      properties: {
        name: '南区蔬菜大棚',
        crop: 'vegetables',
        area_hectares: 8.3,
        probe_ids: ['S01', 'S02', 'S03', 'S04'],
      },
    },
    {
      type: 'Feature',
      id: 'field_north',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [118.774, 32.072],
          [118.785, 32.071],
          [118.787, 32.077],
          [118.783, 32.080],
          [118.776, 32.079],
          [118.774, 32.072],
        ]],
      },
      properties: {
        name: '北区果园',
        crop: 'orchard',
        area_hectares: 18.7,
        probe_ids: ['N01', 'N02', 'N03', 'N04'],
      },
    },
    {
      type: 'Feature',
      id: 'field_center',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [118.777, 32.058],
          [118.783, 32.058],
          [118.784, 32.062],
          [118.781, 32.063],
          [118.776, 32.062],
          [118.777, 32.058],
        ]],
      },
      properties: {
        name: '中心试验区',
        crop: 'experiment',
        area_hectares: 5.1,
        probe_ids: ['C01', 'C02', 'C03'],
      },
    },
  ],
}
