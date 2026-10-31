export class StartGoogleLoginCommand {}

export interface StartGoogleLoginResult {
  authorizationUrl: string;
  browserBinding: string;
}
