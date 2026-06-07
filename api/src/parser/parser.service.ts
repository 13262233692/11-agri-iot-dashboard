import { Injectable } from '@nestjs/common'
import type { SensorReading } from '../types.js'
import { getProbeFieldId, PROBE_REGISTRY } from '../farm-data/probe-registry.js'
import { InfluxDbService } from '../influxdb/influxdb.service.js'
import { AlertService } from '../alert/alert.service.js'

@Injectable()
export class ParserService {
  constructor(
    private readonly influxDbService: InfluxDbService,
    private readonly alertService: AlertService,
  ) {}

  parseHex(hex: string): Partial<SensorReading> {
    const buf = Buffer.from(hex, 'hex')
    return {
      nitrogen: buf.readUInt16BE(0) / 10,
      phosphorus: buf.readUInt16BE(2) / 10,
      potassium: buf.readUInt16BE(4) / 10,
      conductivity: buf.readUInt16BE(6) / 1,
      temperature: buf.readInt16BE(8) / 10,
      moisture: buf.readUInt16BE(10) / 10,
    }
  }

  parseAndEmit(probeId: string, hex: string): void {
    const parsed = this.parseHex(hex)
    const fieldId = getProbeFieldId(probeId)
    const reading: SensorReading = {
      probeId,
      fieldId,
      timestamp: new Date().toISOString(),
      ...parsed,
    } as SensorReading

    const probe = PROBE_REGISTRY.get(probeId)
    if (probe) {
      probe.lastSeen = reading.timestamp
      probe.latestReading = reading
      probe.online = true
    }

    this.influxDbService.write(reading)
    this.alertService.check(reading)
  }
}
