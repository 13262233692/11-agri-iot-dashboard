import { Module } from '@nestjs/common'
import { ParserService } from './parser.service.js'
import { InfluxDbModule } from '../influxdb/influxdb.module.js'
import { AlertModule } from '../alert/alert.module.js'

@Module({
  imports: [InfluxDbModule, AlertModule],
  providers: [ParserService],
  exports: [ParserService],
})
export class ParserModule {}
