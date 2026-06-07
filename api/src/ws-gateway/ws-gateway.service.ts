import { OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { InfluxDbService } from '../influxdb/influxdb.service.js'
import { AlertService } from '../alert/alert.service.js'
import { VpdControlService } from '../vpd-control/vpd-control.service.js'
import { TokenBucket } from '../common/token-bucket.js'
import configuration from '../config/configuration.js'
import type { AlertEvent, VpdReading, ControlAction } from '../types.js'

@WebSocketGateway({
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6,
})
export class WsGatewayService implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WsGatewayService.name)
  private pushInterval: NodeJS.Timeout | null = null
  private emitBucket: TokenBucket
  private maxConnections: number
  private connectedClients: Set<string> = new Set()
  private droppedEmits = 0

  constructor(
    private readonly influxDbService: InfluxDbService,
    private readonly alertService: AlertService,
    private readonly vpdControlService: VpdControlService,
  ) {
    const cfg = configuration.ws
    this.maxConnections = cfg.maxConnections
    this.emitBucket = new TokenBucket(cfg.emitBucketCapacity, cfg.emitBucketRefillPerSec)
  }

  onModuleInit() {
    this.alertService.on('alert', (alert: AlertEvent) => {
      if (this.connectedClients.size === 0) return
      this.throttledEmit('sensor:alert', alert)
    })

    this.vpdControlService.on('vpd:update', (vpd: VpdReading) => {
      if (this.connectedClients.size === 0) return
      this.throttledEmit('vpd:update', vpd)
    })

    this.vpdControlService.on('control:action', (action: ControlAction) => {
      if (this.connectedClients.size === 0) return
      this.throttledEmit('control:action', action)
    })

    this.pushInterval = setInterval(() => {
      if (this.connectedClients.size === 0) return
      this.pushAggregated()
      this.pushOnlineStats()
    }, 5000)
  }

  onModuleDestroy() {
    if (this.pushInterval) {
      clearInterval(this.pushInterval)
    }
  }

  handleConnection(client: Socket) {
    if (this.connectedClients.size >= this.maxConnections) {
      this.logger.warn(`WS connection rejected: ${client.id} (max ${this.maxConnections} reached)`)
      client.emit('error', { message: 'Max connections reached' })
      client.disconnect(true)
      return
    }

    this.connectedClients.add(client.id)
    this.logger.log(`WS client connected: ${client.id} (total: ${this.connectedClients.size})`)

    const latestReadings = Object.fromEntries(this.influxDbService.getLatestReadings())
    const onlineStats = this.influxDbService.getOnlineStats()
    const recentAlerts = this.alertService.getRecentAlerts()
    const vpdReadings = Object.fromEntries(this.vpdControlService.getLatestVpd())
    const controlHistory = this.vpdControlService.getControlHistory()
    const solenoidStates = this.vpdControlService.getSolenoidStates()

    client.emit('sensor:latest', latestReadings)
    client.emit('sensor:online-stats', onlineStats)
    client.emit('sensor:alerts', recentAlerts)
    client.emit('vpd:latest', vpdReadings)
    client.emit('control:history', controlHistory)
    client.emit('control:solenoid-states', solenoidStates)
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id)
    this.logger.log(`WS client disconnected: ${client.id} (total: ${this.connectedClients.size})`)
  }

  @SubscribeMessage('sensor:subscribe')
  handleSubscribe() {
    this.pushAggregated()
    this.pushOnlineStats()
  }

  private pushAggregated() {
    if (!this.emitBucket.tryConsume(1)) {
      this.droppedEmits++
      this.logger.warn(`Aggregated emit throttled (dropped total: ${this.droppedEmits})`)
      return
    }
    const aggregated = this.influxDbService.getAggregated('5m', '1h')
    this.server?.emit('sensor:aggregate', aggregated)
  }

  private pushOnlineStats() {
    if (!this.emitBucket.tryConsume(1)) {
      return
    }
    const stats = this.influxDbService.getOnlineStats()
    this.server?.emit('sensor:online-stats', stats)
  }

  private throttledEmit(event: string, data: any) {
    if (!this.emitBucket.tryConsume(1)) {
      this.droppedEmits++
      return
    }
    this.server?.emit(event, data)
  }
}
