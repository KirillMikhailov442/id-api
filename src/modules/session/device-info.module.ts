import { Module } from "@nestjs/common";

import { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";

export { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";

@Module({
  providers: [DeviceInfoParser],
  exports: [DeviceInfoParser],
})
export class DeviceInfoModule {}
