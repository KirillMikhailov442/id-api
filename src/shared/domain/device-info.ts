export class DeviceInfo {
  readonly browser: string | null;
  readonly os: string | null;
  readonly deviceType: string | null;

  constructor(browser: string | null, os: string | null, deviceType: string | null) {
    this.browser = browser;
    this.os = os;
    this.deviceType = deviceType;
  }
}
