export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  sessionVersion: number;
  roles: string[];
}
