import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { LogoutAllCommand } from "@modules/auth/application/command/logout-all.command";
import type { IRefreshTokenService } from "@modules/auth/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/auth/application/port/session-repository";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY } from "@modules/auth/auth.tokens";
import { InvalidRefreshTokenException } from "@modules/auth/domain/exception/invalid-refresh-token.exception";

@CommandHandler(LogoutAllCommand)
@Injectable()
export class LogoutAllCommandHandler implements ICommandHandler<LogoutAllCommand> {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: IRefreshTokenService
  ) {}

  async execute(command: LogoutAllCommand): Promise<void> {
    const session = await this.sessionRepository.findByRefreshHash(this.refreshTokenService.hash(command.refreshToken));

    if (session === null || !session.isActive()) {
      throw new InvalidRefreshTokenException();
    }

    await this.sessionRepository.revokeAllByUserId(session.getUserId(), new Date());
  }
}
