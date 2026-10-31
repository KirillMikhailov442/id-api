import type { DeviceInfo } from "@modules/session/application/device-info.type";

export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly deviceInfo: DeviceInfo,
    public readonly ip: string
  ) {}
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}
