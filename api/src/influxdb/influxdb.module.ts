import { Module } from '@nestjs/common'
import { InfluxDbService } from './influxdb.service.js'

@Module({
  providers: [InfluxDbService],
  exports: [InfluxDbService],
})
export class InfluxDbModule {}
