import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { LogoutCommand } from "@modules/session/application/command/logout.command";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY } from "@modules/session/session.tokens";

@CommandHandler(LogoutCommand)
@Injectable()
export class LogoutCommandHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: IRefreshTokenService
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const refreshHash = this.refreshTokenService.hash(command.refreshToken);
    const candidate = await this.sessionRepository.findByRefreshHash(refreshHash);

    if (candidate === null) {
      throw new InvalidRefreshTokenException();
    }

    await this.sessionRepository.withUserLock(candidate.getUserId(), async (repository) => {
      const session = await repository.findByRefreshHash(refreshHash);
      const token = await repository.findRefreshToken(refreshHash);

      if (
        session === null ||
        !session.isActive() ||
        token === null ||
        token.usedAt !== null ||
        token.revokedAt !== null ||
        token.expiresAt.getTime() <= Date.now()
      ) {
        throw new InvalidRefreshTokenException();
      }

      await repository.revokeById(session.getId(), new Date());
    });
  }
}
