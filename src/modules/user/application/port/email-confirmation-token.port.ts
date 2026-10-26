export interface EmailConfirmationTokenPayload {
  userId: string;
  email: string;
}

export interface IEmailConfirmationTokenService {
  generate(payload: EmailConfirmationTokenPayload): Promise<string>;
  verify(token: string): Promise<EmailConfirmationTokenPayload>;
}
