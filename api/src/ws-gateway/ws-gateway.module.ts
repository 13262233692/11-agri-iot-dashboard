import { Module } from '@nestjs/common'
import { WsGatewayService } from './ws-gateway.service.js'
import { InfluxDbModule } from '../influxdb/influxdb.module.js'
import { AlertModule } from '../alert/alert.module.js'
import { VpdControlModule } from '../vpd-control/vpd-control.module.js'

@Module({
  imports: [InfluxDbModule, AlertModule, VpdControlModule],
  providers: [WsGatewayService],
  exports: [WsGatewayService],
})
export class WsGatewayModule {}
