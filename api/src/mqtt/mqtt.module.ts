import { Module } from '@nestjs/common'
import { MqttService } from './mqtt.service.js'
import { ParserModule } from '../parser/parser.module.js'

@Module({
  imports: [ParserModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
