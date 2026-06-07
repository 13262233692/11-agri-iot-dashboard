import { Injectable } from '@nestjs/common'
import { EventEmitter } from 'events'
import type { SensorReading, AlertEvent } from '../types.js'
import { PROBE_REGISTRY } from '../farm-data/probe-registry.js'

@Injectable()
export class AlertService extends EventEmitter {
  private recentAlerts: AlertEvent[] = []

  check(reading: SensorReading): void {
    const thresholds: { field: keyof SensorReading; limit: number; label: string }[] = [
      { field: 'nitrogen', limit: 120, label: '氮含量' },
      { field: 'phosphorus', limit: 80, label: '磷含量' },
      { field: 'potassium', limit: 200, label: '钾含量' },
      { field: 'temperature', limit: 40, label: '温度' },
      { field: 'conductivity', limit: 500, label: '电导率' },
    ]

    for (const t of thresholds) {
      if ((reading[t.field] as number) > t.limit) {
        const alert: AlertEvent = {
          type: 'THRESHOLD_EXCEED',
          probeId: reading.probeId,
          message: `${t.label}超限: ${reading[t.field]} > ${t.limit}`,
          timestamp: new Date().toISOString(),
        }
        this.pushAlert(alert)
      }
    }
  }

  checkOffline(): void {
    const now = Date.now()
    for (const [probeId, probe] of PROBE_REGISTRY) {
      if (probe.lastSeen) {
        const elapsed = now - new Date(probe.lastSeen).getTime()
        if (elapsed > 60000 && probe.online) {
          probe.online = false
          const alert: AlertEvent = {
            type: 'OFFLINE',
            probeId,
            message: `探针 ${probeId} 已离线`,
            timestamp: new Date().toISOString(),
          }
          this.pushAlert(alert)
        }
      }
    }
  }

  getRecentAlerts(): AlertEvent[] {
    return this.recentAlerts.slice(-20)
  }

  private pushAlert(alert: AlertEvent): void {
    this.recentAlerts.push(alert)
    if (this.recentAlerts.length > 50) {
      this.recentAlerts.shift()
    }
    this.emit('alert', alert)
  }
}
