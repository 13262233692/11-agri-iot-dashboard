import { Controller, Get } from '@nestjs/common'
import { InfluxDbService } from '../influxdb/influxdb.service.js'
import { MqttService } from '../mqtt/mqtt.service.js'
import { FARM_FIELDS } from '../farm-data/farm-geojson.js'
import type { FarmFieldGeoJSON, OnlineStats } from '../types.js'

@Controller('farm')
export class FarmController {
  constructor(
    private readonly influxDbService: InfluxDbService,
    private readonly mqttService: MqttService,
  ) {}

  @Get('geojson')
  getGeoJson(): FarmFieldGeoJSON {
    return FARM_FIELDS
  }

  @Get('stats')
  getStats(): OnlineStats {
    return this.influxDbService.getOnlineStats()
  }

  @Get('health')
  getHealth() {
    return {
      mqtt: this.mqttService.getConnectionStatus(),
      influxdb: this.influxDbService.getWriteStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }
  }
}
