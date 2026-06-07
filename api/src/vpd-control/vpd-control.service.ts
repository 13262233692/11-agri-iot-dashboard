import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { EventEmitter } from 'events'
import type { SensorReading, VpdReading, ControlAction } from '../types.js'
import { FARM_FIELDS } from '../farm-data/farm-geojson.js'
import configuration from '../config/configuration.js'

interface FieldVpdState {
  consecutiveCritical: number
  lastVpd: VpdReading | null
  solenoidActive: boolean
  solenoidTimer: NodeJS.Timeout | null
}

@Injectable()
export class VpdControlService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(VpdControlService.name)
  private fieldStates: Map<string, FieldVpdState> = new Map()
  private controlHistory: ControlAction[] = []
  private latestVpdReadings: Map<string, VpdReading> = new Map()
  private fieldNameMap: Map<string, string> = new Map()

  private readonly criticalThreshold: number
  private readonly cautionThreshold: number
  private readonly sustainedReadings: number
  private readonly solenoidOnDurationMs: number
  private readonly controlTopicPrefix: string

  constructor() {
    super()
    const cfg = configuration.vpd
    this.criticalThreshold = cfg.criticalThresholdKpa
    this.cautionThreshold = cfg.cautionThresholdKpa
    this.sustainedReadings = cfg.sustainedReadings
    this.solenoidOnDurationMs = cfg.solenoidOnDurationMs
    this.controlTopicPrefix = cfg.controlTopicPrefix
  }

  onModuleInit() {
    for (const feature of FARM_FIELDS.features) {
      this.fieldStates.set(feature.id, {
        consecutiveCritical: 0,
        lastVpd: null,
        solenoidActive: false,
        solenoidTimer: null,
      })
      this.fieldNameMap.set(feature.id, feature.properties.name)
    }
    this.logger.log(
      `VPD control initialized: critical=${this.criticalThreshold}kPa caution=${this.cautionThreshold}kPa sustained=${this.sustainedReadings}`,
    )
  }

  evaluate(reading: SensorReading): void {
    if (reading.humidity === undefined || reading.humidity === null) return

    const fieldId = reading.fieldId
    const state = this.fieldStates.get(fieldId)
    if (!state) return

    const temperature = reading.temperature
    const humidity = reading.humidity

    const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3))
    const vpd = svp * (1 - humidity / 100)

    let zone: VpdReading['zone']
    if (vpd >= this.criticalThreshold) {
      zone = 'critical'
    } else if (vpd >= this.cautionThreshold) {
      zone = 'caution'
    } else {
      zone = 'optimal'
    }

    const vpdReading: VpdReading = {
      fieldId,
      temperature,
      humidity,
      svp: Math.round(svp * 100) / 100,
      vpd: Math.round(vpd * 100) / 100,
      zone,
      timestamp: reading.timestamp,
    }

    state.lastVpd = vpdReading
    this.latestVpdReadings.set(fieldId, vpdReading)
    this.emit('vpd:update', vpdReading)

    if (zone === 'critical') {
      state.consecutiveCritical++
      this.logger.warn(
        `VPD critical: ${fieldId} VPD=${vpdReading.vpd}kPa (${state.consecutiveCritical}/${this.sustainedReadings})`,
      )

      if (state.consecutiveCritical >= this.sustainedReadings && !state.solenoidActive) {
        this.triggerSolenoid(fieldId, vpdReading)
      }
    } else {
      state.consecutiveCritical = 0
    }
  }

  private triggerSolenoid(fieldId: string, vpdReading: VpdReading): void {
    const state = this.fieldStates.get(fieldId)
    if (!state || state.solenoidActive) return

    const fieldName = this.fieldNameMap.get(fieldId) ?? fieldId
    const topic = `${this.controlTopicPrefix}/${fieldId}`
    const payload = JSON.stringify({
      action: 'OPEN',
      fieldId,
      vpd: vpdReading.vpd,
      threshold: this.criticalThreshold,
      duration_ms: this.solenoidOnDurationMs,
      timestamp: new Date().toISOString(),
    })

    state.solenoidActive = true

    const action: ControlAction = {
      id: `ctrl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'SOLENOID_OPEN',
      fieldId,
      fieldName,
      vpd: vpdReading.vpd,
      threshold: this.criticalThreshold,
      topic,
      payload,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    }

    this.controlHistory.push(action)
    if (this.controlHistory.length > 50) {
      this.controlHistory = this.controlHistory.slice(-50)
    }

    this.emit('control:command', { topic, payload })
    this.emit('control:action', action)
    this.logger.warn(
      `SOLENOID OPEN: ${fieldName} (${fieldId}) VPD=${vpdReading.vpd}kPa > ${this.criticalThreshold}kPa`,
    )

    state.solenoidTimer = setTimeout(() => {
      this.closeSolenoid(fieldId)
    }, this.solenoidOnDurationMs)
  }

  private closeSolenoid(fieldId: string): void {
    const state = this.fieldStates.get(fieldId)
    if (!state) return

    const fieldName = this.fieldNameMap.get(fieldId) ?? fieldId
    const topic = `${this.controlTopicPrefix}/${fieldId}`
    const payload = JSON.stringify({
      action: 'CLOSE',
      fieldId,
      timestamp: new Date().toISOString(),
    })

    state.solenoidActive = false
    state.solenoidTimer = null

    const action: ControlAction = {
      id: `ctrl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'SOLENOID_CLOSE',
      fieldId,
      fieldName,
      vpd: state.lastVpd?.vpd ?? 0,
      threshold: this.criticalThreshold,
      topic,
      payload,
      timestamp: new Date().toISOString(),
      acknowledged: true,
    }

    this.controlHistory.push(action)
    if (this.controlHistory.length > 50) {
      this.controlHistory = this.controlHistory.slice(-50)
    }

    this.emit('control:command', { topic, payload })
    this.emit('control:action', action)
    this.logger.log(`SOLENOID CLOSE: ${fieldName} (${fieldId})`)
  }

  getLatestVpd(): Map<string, VpdReading> {
    return this.latestVpdReadings
  }

  getVpdByField(fieldId: string): VpdReading | null {
    return this.latestVpdReadings.get(fieldId) ?? null
  }

  getControlHistory(): ControlAction[] {
    return this.controlHistory.slice(-20)
  }

  getSolenoidStates(): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    for (const [fieldId, state] of this.fieldStates) {
      result[fieldId] = state.solenoidActive
    }
    return result
  }
}
