import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { EventEmitter } from 'events'
import * as mqtt from 'mqtt'
import { ParserService } from '../parser/parser.service.js'
import configuration from '../config/configuration.js'
import { ExponentialBackoff } from '../common/exponential-backoff.js'
import { TokenBucket } from '../common/token-bucket.js'

interface ProbeReconnectState {
  backoff: ExponentialBackoff
  lastMessageAt: number
  messageCount: number
  throttledCount: number
}

@Injectable()
export class MqttService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name)
  private client: mqtt.MqttClient | null = null
  private errorLogged = false
  private connectionBackoff: ExponentialBackoff
  private reconnectTimer: NodeJS.Timeout | null = null
  private isShuttingDown = false
  private isConnected = false

  private messageBucket: TokenBucket
  private probeStates: Map<string, ProbeReconnectState> = new Map()
  private statsInterval: NodeJS.Timeout | null = null
  private totalMessagesReceived = 0
  private totalMessagesThrottled = 0

  constructor(private readonly parserService: ParserService) {
    super()
    const cfg = configuration.mqtt
    this.connectionBackoff = new ExponentialBackoff(cfg.backoffBaseMs, cfg.backoffMaxMs, cfg.backoffJitter)
    this.messageBucket = new TokenBucket(cfg.messageBucketCapacity, cfg.messageBucketRefillPerSec)
  }

  async onModuleInit() {
    this.connectWithBackoff()
    this.statsInterval = setInterval(() => this.logThrottleStats(), 30000)
  }

  onModuleDestroy() {
    this.isShuttingDown = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
    if (this.client) {
      this.client.end(true)
      this.client = null
    }
  }

  private connectWithBackoff(): void {
    if (this.isShuttingDown) return

    const config = configuration.mqtt
    try {
      this.client = mqtt.connect(config.brokerUrl, {
        reconnectPeriod: 0,
        connectTimeout: config.connectTimeoutMs,
        clean: true,
        keepalive: 60,
      })

      this.client.on('connect', () => {
        this.isConnected = true
        this.connectionBackoff.reset()
        this.logger.log('Connected to MQTT broker (backoff reset)')
        this.errorLogged = false
        this.client!.subscribe(`${config.topicPrefix}/#`, { qos: 1 }, (err) => {
          if (err) {
            this.logger.warn(`Subscription failed: ${err.message}`)
          }
        })
      })

      this.client.on('message', (topic: string, message: Buffer) => {
        this.handleMessage(topic, message)
      })

      this.client.on('error', (err: Error) => {
        if (!this.errorLogged) {
          this.logger.warn(`MQTT error: ${err.message}`)
          this.errorLogged = true
        }
      })

      this.client.on('close', () => {
        this.isConnected = false
        this.scheduleReconnect()
      })

      this.client.on('offline', () => {
        this.isConnected = false
      })
    } catch (err: any) {
      this.logger.warn(`MQTT connection failed: ${err.message}. Simulator fallback available.`)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.isConnected) return

    const delay = this.connectionBackoff.nextDelay()
    this.logger.log(`Reconnecting in ${delay}ms (attempt ${this.connectionBackoff.getAttempt()})`)

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.client) {
        this.client.end(true)
        this.client = null
      }
      this.connectWithBackoff()
    }, delay)
  }

  private handleMessage(topic: string, message: Buffer): void {
    this.totalMessagesReceived++

    const segments = topic.split('/')
    const probeId = segments[segments.length - 1]

    if (!this.messageBucket.tryConsume(1)) {
      this.totalMessagesThrottled++
      const state = this.getProbeState(probeId)
      state.throttledCount++
      return
    }

    const state = this.getProbeState(probeId)
    state.messageCount++
    state.lastMessageAt = Date.now()
    state.backoff.reset()

    const hexPayload = message.toString()
    this.emit('raw_message', { probeId, hex: hexPayload })
    this.parserService.parseAndEmit(probeId, hexPayload)
  }

  private getProbeState(probeId: string): ProbeReconnectState {
    let state = this.probeStates.get(probeId)
    if (!state) {
      state = {
        backoff: new ExponentialBackoff(500, 30000, 0.25),
        lastMessageAt: 0,
        messageCount: 0,
        throttledCount: 0,
      }
      this.probeStates.set(probeId, state)
    }
    return state
  }

  private logThrottleStats(): void {
    if (this.totalMessagesReceived === 0 && this.totalMessagesThrottled === 0) return
    this.logger.log(
      `MQTT stats: received=${this.totalMessagesReceived} throttled=${this.totalMessagesThrottled} ` +
      `active_probes=${this.probeStates.size} bucket_available=${this.messageBucket.available()}`,
    )
    const now = Date.now()
    let staleCount = 0
    for (const [probeId, state] of this.probeStates) {
      if (now - state.lastMessageAt > 300000) {
        staleCount++
        this.probeStates.delete(probeId)
      }
    }
    if (staleCount > 0) {
      this.logger.log(`Cleaned ${staleCount} stale probe states`)
    }
  }

  publish(topic: string, message: string): void {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message)
    }
  }

  getConnectionStatus(): { connected: boolean; backoffAttempt: number } {
    return {
      connected: this.isConnected,
      backoffAttempt: this.connectionBackoff.getAttempt(),
    }
  }

  isClientConnected(): boolean {
    return this.isConnected
  }
}
