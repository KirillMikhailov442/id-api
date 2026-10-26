export class RefreshCommand {
  readonly refreshToken: string;
  readonly userAgent: string;
  readonly ip: string;

  constructor(refreshToken: string, userAgent: string, ip: string) {
    this.refreshToken = refreshToken;
    this.userAgent = userAgent;
    this.ip = ip;
  }
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}
