import { OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { InfluxDbService } from '../influxdb/influxdb.service.js'
import { AlertService } from '../alert/alert.service.js'
import type { AlertEvent } from '../types.js'

@WebSocketGateway({ cors: { origin: '*' } })
export class WsGatewayService implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WsGatewayService.name)
  private pushInterval: NodeJS.Timeout | null = null

  constructor(
    private readonly influxDbService: InfluxDbService,
    private readonly alertService: AlertService,
  ) {}

  onModuleInit() {
    this.alertService.on('alert', (alert: AlertEvent) => {
      this.server?.emit('sensor:alert', alert)
    })

    this.pushInterval = setInterval(() => {
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
    const latestReadings = Object.fromEntries(this.influxDbService.getLatestReadings())
    const onlineStats = this.influxDbService.getOnlineStats()
    const recentAlerts = this.alertService.getRecentAlerts()

    client.emit('sensor:latest', latestReadings)
    client.emit('sensor:online-stats', onlineStats)
    client.emit('sensor:alerts', recentAlerts)
  }

  @SubscribeMessage('sensor:subscribe')
  handleSubscribe() {
    this.pushAggregated()
    this.pushOnlineStats()
  }

  private pushAggregated() {
    const aggregated = this.influxDbService.getAggregated('5m', '1h')
    this.server?.emit('sensor:aggregate', aggregated)
  }

  private pushOnlineStats() {
    const stats = this.influxDbService.getOnlineStats()
    this.server?.emit('sensor:online-stats', stats)
  }
}
