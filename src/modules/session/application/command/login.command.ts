export class LoginCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly userAgent: string;
  public readonly ip: string;

  constructor(email: string, password: string, userAgent: string, ip: string) {
    this.email = email;
    this.password = password;
    this.userAgent = userAgent;
    this.ip = ip;
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}
