import type { DeviceInfo } from "@shared/domain/device-info";

export class LoginCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly deviceInfo: DeviceInfo;
  public readonly ip: string;

  constructor(email: string, password: string, deviceInfo: DeviceInfo, ip: string) {
    this.email = email;
    this.password = password;
    this.deviceInfo = deviceInfo;
    this.ip = ip;
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}
