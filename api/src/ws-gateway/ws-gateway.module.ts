import { Module } from '@nestjs/common'
import { WsGatewayService } from './ws-gateway.service.js'
import { InfluxDbModule } from '../influxdb/influxdb.module.js'
import { AlertModule } from '../alert/alert.module.js'

@Module({
  imports: [InfluxDbModule, AlertModule],
  providers: [WsGatewayService],
  exports: [WsGatewayService],
})
export class WsGatewayModule {}
