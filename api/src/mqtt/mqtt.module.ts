import { Module } from '@nestjs/common'
import { MqttService } from './mqtt.service.js'
import { ParserModule } from '../parser/parser.module.js'
import { VpdControlModule } from '../vpd-control/vpd-control.module.js'

@Module({
  imports: [ParserModule, VpdControlModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
