import { Module } from '@nestjs/common'
import { SensorController } from './sensor.controller.js'
import { FarmController } from './farm.controller.js'
import { InfluxDbModule } from '../influxdb/influxdb.module.js'
import { MqttModule } from '../mqtt/mqtt.module.js'

@Module({
  imports: [InfluxDbModule, MqttModule],
  controllers: [SensorController, FarmController],
})
export class SensorModule {}
