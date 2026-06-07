import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { EventEmitter } from 'events'
import * as mqtt from 'mqtt'
import { ParserService } from '../parser/parser.service.js'
import configuration from '../config/configuration.js'

@Injectable()
export class MqttService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name)
  private client: mqtt.MqttClient | null = null
  private errorLogged = false

  constructor(private readonly parserService: ParserService) {
    super()
  }

  async onModuleInit() {
    const config = configuration.mqtt
    try {
      this.client = mqtt.connect(config.brokerUrl, {
        reconnectPeriod: 30000,
        connectTimeout: 5000,
      })
      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker')
        this.errorLogged = false
        this.client!.subscribe(`${config.topicPrefix}/#`)
      })
      this.client.on('message', (topic: string, message: Buffer) => {
        const segments = topic.split('/')
        const probeId = segments[segments.length - 1]
        const hexPayload = message.toString()
        this.emit('raw_message', { probeId, hex: hexPayload })
        this.parserService.parseAndEmit(probeId, hexPayload)
      })
      this.client.on('error', (err: Error) => {
        if (!this.errorLogged) {
          this.logger.warn(`MQTT connection error: ${err.message}. Retrying...`)
          this.errorLogged = true
        }
      })
    } catch (err: any) {
      this.logger.warn(`MQTT connection failed: ${err.message}. Simulator fallback available.`)
    }
  }

  publish(topic: string, message: string): void {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message)
    }
  }

  isConnected(): boolean {
    return !!this.client?.connected
  }
}
