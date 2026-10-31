import { Inject, Injectable } from "@nestjs/common";
import type { SessionAuthContext } from "@shared/auth/contract/auth-context";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";

import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import type { ISessionRevocationStore } from "@modules/session/application/port/session-revocation-store.type";
import { JwtAccessTokenService } from "@modules/session/infrastructure/security/token/jwt-access-token.service";
import { SessionId } from "@modules/session/session.ids";
import { SESSION_REPOSITORY, SESSION_REVOCATION_STORE } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

@Injectable()
export class SessionAuthenticationService {
  constructor(
    @Inject(JwtAccessTokenService) private readonly jwt: JwtAccessTokenService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: ISessionRepository,
    @Inject(SESSION_REVOCATION_STORE) private readonly revocations: ISessionRevocationStore
  ) {}

  async authenticate(token: string): Promise<SessionAuthContext> {
    const payload = await this.jwt.verify(token);
    const sessionId = SessionId.from(payload.sessionId);

    if (await this.revocations.isRevoked(sessionId, payload.sessionVersion)) {
      throw new InvalidAccessTokenException("Session is revoked or access token has been replaced");
    }

    const session = await this.sessions.findById(sessionId);

    if (
      session === null ||
      !session.isActive() ||
      !session.getUserId().equals(UserId.from(payload.userId)) ||
      session.getVersion() !== payload.sessionVersion
    ) {
      throw new InvalidAccessTokenException("Session is revoked or access token has been replaced");
    }

    return { ...payload, type: AccessTokenType.Session };
  }
}
