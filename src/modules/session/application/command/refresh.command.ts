export class RefreshCommand {
  constructor(
    readonly refreshToken: string,
    readonly userAgent: string,
    readonly ip: string
  ) {}
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}
