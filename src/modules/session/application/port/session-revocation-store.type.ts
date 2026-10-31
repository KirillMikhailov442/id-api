import type { SessionId } from "@modules/session/session.ids";

export interface ISessionRevocationStore {
  revokeThrough(sessionId: SessionId, version: number, expiresAt: Date): Promise<void>;
  isRevoked(sessionId: SessionId, version: number): Promise<boolean>;
}
