export interface ConfirmationEmailData {
  name: string;
  confirmUrl: string;
}

export interface WelcomeEmailData {
  name: string;
  loginUrl: string;
}

export interface BlockedAccountEmailData {
  email: string;
  blockedAt: Date;
  reason?: string;
}
