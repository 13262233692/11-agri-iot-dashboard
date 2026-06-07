import { Module } from '@nestjs/common'
import { SimulatorService } from './simulator.service.js'
import { MqttModule } from '../mqtt/mqtt.module.js'
import { ParserModule } from '../parser/parser.module.js'

@Module({
  imports: [MqttModule, ParserModule],
  providers: [SimulatorService],
})
export class SimulatorModule {}
