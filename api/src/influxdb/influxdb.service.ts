import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import type { SensorReading, AggregatedBatch, OnlineStats } from '../types.js'
import { PROBE_REGISTRY } from '../farm-data/probe-registry.js'

@Injectable()
export class InfluxDbService implements OnModuleInit {
  private readonly logger = new Logger(InfluxDbService.name)
  private memoryStore: Map<string, SensorReading[]> = new Map()
  private influxAvailable = false
  private writeApi: any = null
  private queryApi: any = null
  private PointClass: any = null

  async onModuleInit() {
    try {
      const influxModule = await import('@influxdata/influxdb-client')
      const config = (await import('../config/configuration.js')).default
      const InfluxDB = influxModule.InfluxDB
      this.PointClass = influxModule.Point
      const influx = new InfluxDB({ url: config.influxdb.url, token: config.influxdb.token })
      this.writeApi = influx.getWriteApi(config.influxdb.org, config.influxdb.bucket, 'ms', {
        flushInterval: 10000,
        maxRetries: 0,
      })
      this.queryApi = influx.getQueryApi(config.influxdb.org)
      this.influxAvailable = true
      this.logger.log('InfluxDB client initialized (writes will be attempted)')
    } catch {
      this.influxAvailable = false
      this.logger.warn('InfluxDB unavailable — using in-memory store only')
    }
  }

  write(reading: SensorReading): void {
    const arr = this.memoryStore.get(reading.probeId) ?? []
    arr.push(reading)
    if (arr.length > 100) arr.shift()
    this.memoryStore.set(reading.probeId, arr)

    if (this.influxAvailable && this.writeApi && this.PointClass) {
      try {
        const point = new this.PointClass('soil_reading')
          .tag('probeId', reading.probeId)
          .tag('fieldId', reading.fieldId)
          .floatField('nitrogen', reading.nitrogen)
          .floatField('phosphorus', reading.phosphorus)
          .floatField('potassium', reading.potassium)
          .floatField('conductivity', reading.conductivity)
          .floatField('temperature', reading.temperature)
          .floatField('moisture', reading.moisture)
          .timestamp(new Date(reading.timestamp))
        this.writeApi.writePoint(point)
      } catch {
        this.influxAvailable = false
      }
    }
  }

  getAggregated(interval: string, lookback: string): AggregatedBatch[] {
    const now = Date.now()
    const lookbackMs = this.parseDuration(lookback)
    const allReadings: SensorReading[] = []

    for (const readings of this.memoryStore.values()) {
      for (const r of readings) {
        if (now - new Date(r.timestamp).getTime() <= lookbackMs) {
          allReadings.push(r)
        }
      }
    }

    allReadings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const buckets = new Map<string, SensorReading[]>()
    for (const r of allReadings) {
      const time = new Date(r.timestamp).getTime()
      const bucketStart = Math.floor(time / 300000) * 300000
      const key = new Date(bucketStart).toISOString()
      const bucket = buckets.get(key) ?? []
      bucket.push(r)
      buckets.set(key, bucket)
    }

    const result: AggregatedBatch[] = []
    for (const [intervalStart, readings] of buckets) {
      result.push({
        interval: intervalStart,
        readings: this.averageReadings(readings),
      })
    }
    return result
  }

  getHistory(probeId: string, start: Date, end: Date): SensorReading[] {
    const readings = this.memoryStore.get(probeId) ?? []
    return readings.filter(
      (r) => {
        const t = new Date(r.timestamp).getTime()
        return t >= start.getTime() && t <= end.getTime()
      },
    )
  }

  getLatestReadings(): Map<string, SensorReading> {
    const result = new Map<string, SensorReading>()
    for (const [probeId, readings] of this.memoryStore) {
      if (readings.length > 0) {
        result.set(probeId, readings[readings.length - 1])
      }
    }
    return result
  }

  getOnlineStats(): OnlineStats {
    const now = Date.now()
    let online = 0
    let offline = 0
    for (const [probeId] of PROBE_REGISTRY) {
      const readings = this.memoryStore.get(probeId) ?? []
      const latest = readings[readings.length - 1]
      if (latest && now - new Date(latest.timestamp).getTime() < 60000) {
        online++
      } else {
        offline++
      }
    }
    return { online, offline, total: online + offline }
  }

  private averageReadings(readings: SensorReading[]): SensorReading[] {
    if (readings.length === 0) return []
    const sum = { nitrogen: 0, phosphorus: 0, potassium: 0, conductivity: 0, temperature: 0, moisture: 0 }
    for (const r of readings) {
      sum.nitrogen += r.nitrogen
      sum.phosphorus += r.phosphorus
      sum.potassium += r.potassium
      sum.conductivity += r.conductivity
      sum.temperature += r.temperature
      sum.moisture += r.moisture
    }
    const n = readings.length
    const first = readings[0]
    return [{
      probeId: first.probeId,
      fieldId: first.fieldId,
      timestamp: first.timestamp,
      nitrogen: Math.round(sum.nitrogen / n * 10) / 10,
      phosphorus: Math.round(sum.phosphorus / n * 10) / 10,
      potassium: Math.round(sum.potassium / n * 10) / 10,
      conductivity: Math.round(sum.conductivity / n * 10) / 10,
      temperature: Math.round(sum.temperature / n * 10) / 10,
      moisture: Math.round(sum.moisture / n * 10) / 10,
    }]
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(m|h|d|s)$/)
    if (!match) return 3600000
    const value = parseInt(match[1])
    const unit = match[2]
    switch (unit) {
      case 's': return value * 1000
      case 'm': return value * 60000
      case 'h': return value * 3600000
      case 'd': return value * 86400000
      default: return 3600000
    }
  }
}
