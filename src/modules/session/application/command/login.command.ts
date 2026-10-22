export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly userAgent: string,
    public readonly ip: string
  ) {}
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}
