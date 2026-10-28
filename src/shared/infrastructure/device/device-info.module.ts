import { Module } from "@nestjs/common";
import { DeviceInfoParser } from "@shared/infrastructure/device/device-info-parser";

@Module({
  providers: [DeviceInfoParser],
  exports: [DeviceInfoParser],
})
export class DeviceInfoModule {}
