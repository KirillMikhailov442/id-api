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
