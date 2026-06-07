import { Module } from '@nestjs/common'
import { VpdControlService } from './vpd-control.service.js'

@Module({
  providers: [VpdControlService],
  exports: [VpdControlService],
})
export class VpdControlModule {}
