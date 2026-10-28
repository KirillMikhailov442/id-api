import type { DeviceInfo } from "@shared/domain/device-info";

export class RefreshCommand {
  readonly refreshToken: string;
  readonly deviceInfo: DeviceInfo;
  readonly ip: string;

  constructor(refreshToken: string, deviceInfo: DeviceInfo, ip: string) {
    this.refreshToken = refreshToken;
    this.deviceInfo = deviceInfo;
    this.ip = ip;
  }
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}
