import { Controller, Get } from '@nestjs/common'
import { InfluxDbService } from '../influxdb/influxdb.service.js'
import { MqttService } from '../mqtt/mqtt.service.js'
import { VpdControlService } from '../vpd-control/vpd-control.service.js'
import { FARM_FIELDS } from '../farm-data/farm-geojson.js'
import type { FarmFieldGeoJSON, OnlineStats } from '../types.js'

@Controller('farm')
export class FarmController {
  constructor(
    private readonly influxDbService: InfluxDbService,
    private readonly mqttService: MqttService,
    private readonly vpdControlService: VpdControlService,
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

  @Get('vpd')
  getVpd() {
    return Object.fromEntries(this.vpdControlService.getLatestVpd())
  }

  @Get('control-history')
  getControlHistory() {
    return this.vpdControlService.getControlHistory()
  }

  @Get('solenoid-states')
  getSolenoidStates() {
    return this.vpdControlService.getSolenoidStates()
  }
}
