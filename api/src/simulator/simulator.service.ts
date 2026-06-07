import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { MqttService } from '../mqtt/mqtt.service.js'
import { ParserService } from '../parser/parser.service.js'
import configuration from '../config/configuration.js'
import { PROBE_REGISTRY } from '../farm-data/probe-registry.js'

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name)
  private probeIds: string[] = []

  constructor(
    private readonly mqttService: MqttService,
    private readonly parserService: ParserService,
  ) {
    this.probeIds = Array.from(PROBE_REGISTRY.keys()).slice(0, configuration.simulator.probeCount)
  }

  @Interval(3000)
  simulate() {
    if (!configuration.simulator.enabled) return

    const count = 2 + Math.floor(Math.random() * 4)
    const selected = this.pickRandom(this.probeIds, count)

    for (const probeId of selected) {
      const hex = this.generateHex()
      const humidity = this.generateHumidity()
      const topic = `${configuration.mqtt.topicPrefix}/${probeId}`

      if (this.mqttService.isClientConnected()) {
        this.mqttService.publish(topic, hex)
        this.parserService.parseAndEmit(probeId, hex, { humidity })
      } else {
        this.parserService.parseAndEmit(probeId, hex, { humidity })
      }
    }
  }

  private generateHex(): string {
    const isStressScenario = Math.random() < 0.25
    const n = Math.round((40 + Math.random() * 40) * 10)
    const p = Math.round((20 + Math.random() * 30) * 10)
    const k = Math.round((60 + Math.random() * 60) * 10)
    const ec = Math.round(150 + Math.random() * 200)
    const temp = isStressScenario
      ? Math.round((35 + Math.random() * 8) * 10)
      : Math.round((18 + Math.random() * 12) * 10)
    const moist = Math.round((20 + Math.random() * 20) * 10)

    const buf = Buffer.alloc(12)
    buf.writeUInt16BE(n, 0)
    buf.writeUInt16BE(p, 2)
    buf.writeUInt16BE(k, 4)
    buf.writeUInt16BE(ec, 6)
    buf.writeInt16BE(temp, 8)
    buf.writeUInt16BE(moist, 10)

    return buf.toString('hex')
  }

  private generateHumidity(): number {
    const isStressScenario = Math.random() < 0.25
    const base = isStressScenario ? 20 : 50
    const range = isStressScenario ? 20 : 30
    return Math.round((base + Math.random() * range) * 10) / 10
  }

  private pickRandom(arr: string[], count: number): string[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, arr.length))
  }
}
