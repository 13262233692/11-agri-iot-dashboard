import { Controller, Get, Param, Query } from '@nestjs/common'
import { InfluxDbService } from '../influxdb/influxdb.service.js'
import { PROBE_REGISTRY } from '../farm-data/probe-registry.js'
import type { ProbeInfo, SensorReading } from '../types.js'

@Controller('sensors')
export class SensorController {
  constructor(private readonly influxDbService: InfluxDbService) {}

  @Get()
  getAll(): ProbeInfo[] {
    const latestReadings = this.influxDbService.getLatestReadings()
    const result: ProbeInfo[] = []

    for (const [id, probe] of PROBE_REGISTRY) {
      const latest = latestReadings.get(id)
      const isOnline = latest
        ? Date.now() - new Date(latest.timestamp).getTime() < 60000
        : false
      result.push({
        ...probe,
        latestReading: latest ?? probe.latestReading,
        lastSeen: latest ? latest.timestamp : probe.lastSeen,
        online: isOnline,
      })
    }
    return result
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): SensorReading[] {
    const startDate = start ? new Date(start) : new Date(Date.now() - 3600000)
    const endDate = end ? new Date(end) : new Date()
    return this.influxDbService.getHistory(id, startDate, endDate)
  }
}
