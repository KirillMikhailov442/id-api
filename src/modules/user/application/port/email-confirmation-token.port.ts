import type { ITokenService } from "@shared/security/token-service";

export interface EmailConfirmationTokenPayload {
  userId: string;
  email: string;
}

export type IEmailConfirmationTokenService = ITokenService<EmailConfirmationTokenPayload>;
