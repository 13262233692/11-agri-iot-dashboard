import { Module } from '@nestjs/common'
import { ParserService } from './parser.service.js'
import { InfluxDbModule } from '../influxdb/influxdb.module.js'
import { AlertModule } from '../alert/alert.module.js'
import { VpdControlModule } from '../vpd-control/vpd-control.module.js'

@Module({
  imports: [InfluxDbModule, AlertModule, VpdControlModule],
  providers: [ParserService],
  exports: [ParserService],
})
export class ParserModule {}
