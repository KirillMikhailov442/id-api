import type { DeviceInfo } from "@modules/session/application/device-info.type";

export class LoginWithGoogleCommand {
  constructor(
    public readonly deviceInfo: DeviceInfo,
    public readonly ip: string,
    public readonly state?: string,
    public readonly code?: string,
    public readonly error?: string,
    public readonly browserBinding?: string
  ) {}
}
