export interface LoginAttempt {
  nonce: string;
  codeVerifier: string;
}

export interface ILoginAttemptStore {
  save(state: string, browserBinding: string, attempt: LoginAttempt): Promise<void>;
  consume(state: string, browserBinding: string): Promise<LoginAttempt | null>;
}
