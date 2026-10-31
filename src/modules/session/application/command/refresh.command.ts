import type { DeviceInfo } from "@modules/session/application/device-info.type";

export class RefreshCommand {
  constructor(
    readonly refreshToken: string,
    readonly deviceInfo: DeviceInfo,
    readonly ip: string
  ) {}
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}
