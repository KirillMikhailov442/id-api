export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailContent {
  html: string;
  text: string;
}

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
