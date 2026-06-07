import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import type { SensorReading, AggregatedBatch, OnlineStats } from '../types.js'
import { PROBE_REGISTRY } from '../farm-data/probe-registry.js'
import { TokenBucket } from '../common/token-bucket.js'
import configuration from '../config/configuration.js'

const MAX_MEMORY_PER_PROBE = 100

@Injectable()
export class InfluxDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InfluxDbService.name)
  private memoryStore: Map<string, SensorReading[]> = new Map()
  private influxAvailable = false
  private writeApi: any = null
  private queryApi: any = null
  private PointClass: any = null

  private writeBucket: TokenBucket
  private highWatermark: number
  private lowWatermark: number
  private pendingWriteQueue: SensorReading[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private isBackpressured = false
  private totalWrites = 0
  private totalDropped = 0
  private totalInfluxWrites = 0
  private totalInfluxFailures = 0
  private statsInterval: NodeJS.Timeout | null = null

  constructor() {
    const cfg = configuration.influxdb
    this.writeBucket = new TokenBucket(cfg.writeBucketCapacity, cfg.writeBucketRefillPerSec)
    this.highWatermark = cfg.highWatermark
    this.lowWatermark = cfg.lowWatermark
  }

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
      this.writeApi.on('failedRequest', () => {
        if (this.influxAvailable) {
          this.influxAvailable = false
          this.logger.warn('InfluxDB write failed — switching to memory-only mode')
        }
      })
      this.queryApi = influx.getQueryApi(config.influxdb.org)
      this.influxAvailable = true
      this.logger.log('InfluxDB client initialized (writes will be attempted)')
    } catch {
      this.influxAvailable = false
      this.logger.warn('InfluxDB unavailable — using in-memory store only')
    }

    this.flushInterval = setInterval(() => this.flushPendingWrites(), 5000)
    this.statsInterval = setInterval(() => this.logWriteStats(), 30000)
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
    this.flushPendingWrites()
  }

  write(reading: SensorReading): void {
    this.totalWrites++

    const arr = this.memoryStore.get(reading.probeId) ?? []
    arr.push(reading)
    if (arr.length > MAX_MEMORY_PER_PROBE) {
      arr.splice(0, arr.length - MAX_MEMORY_PER_PROBE)
    }
    this.memoryStore.set(reading.probeId, arr)

    if (!this.writeBucket.tryConsume(1)) {
      this.totalDropped++
      if (this.totalDropped % 100 === 1) {
        this.logger.warn(`InfluxDB write throttled: total_dropped=${this.totalDropped} pending=${this.pendingWriteQueue.length}`)
      }
      return
    }

    this.pendingWriteQueue.push(reading)
    if (this.pendingWriteQueue.length > this.highWatermark) {
      this.isBackpressured = true
      this.logger.warn(`Write queue at ${this.pendingWriteQueue.length} (high watermark: ${this.highWatermark}) — backpressure active`)
    }

    if (this.pendingWriteQueue.length >= 100) {
      this.flushPendingWrites()
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

  getWriteStats() {
    return {
      totalWrites: this.totalWrites,
      totalDropped: this.totalDropped,
      totalInfluxWrites: this.totalInfluxWrites,
      totalInfluxFailures: this.totalInfluxFailures,
      pendingQueueLength: this.pendingWriteQueue.length,
      isBackpressured: this.isBackpressured,
      bucketAvailable: this.writeBucket.available(),
    }
  }

  private flushPendingWrites(): void {
    if (this.pendingWriteQueue.length === 0) return

    const batch = this.pendingWriteQueue.splice(0, Math.min(this.pendingWriteQueue.length, 200))

    if (this.pendingWriteQueue.length <= this.lowWatermark) {
      this.isBackpressured = false
    }

    if (!this.influxAvailable || !this.writeApi || !this.PointClass) return

    for (const reading of batch) {
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
        this.totalInfluxWrites++
      } catch {
        this.totalInfluxFailures++
        this.influxAvailable = false
      }
    }
  }

  private logWriteStats(): void {
    if (this.totalWrites === 0) return
    this.logger.log(
      `Write stats: total=${this.totalWrites} dropped=${this.totalDropped} ` +
      `influx_ok=${this.totalInfluxWrites} influx_fail=${this.totalInfluxFailures} ` +
      `pending=${this.pendingWriteQueue.length} backpressured=${this.isBackpressured}`,
    )
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
