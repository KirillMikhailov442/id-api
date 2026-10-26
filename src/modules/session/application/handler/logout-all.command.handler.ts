import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { LogoutAllCommand } from "@modules/session/application/command/logout-all.command";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY } from "@modules/session/session.tokens";

@CommandHandler(LogoutAllCommand)
@Injectable()
export class LogoutAllCommandHandler implements ICommandHandler<LogoutAllCommand> {
  private readonly sessionRepository: ISessionRepository;
  private readonly refreshTokenService: IRefreshTokenService;

  constructor(
    @Inject(SESSION_REPOSITORY)
    sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    refreshTokenService: IRefreshTokenService
  ) {
    this.sessionRepository = sessionRepository;
    this.refreshTokenService = refreshTokenService;
  }

  async execute(command: LogoutAllCommand): Promise<void> {
    const session = await this.sessionRepository.findByRefreshHash(this.refreshTokenService.hash(command.refreshToken));

    if (session === null || !session.isActive()) {
      throw new InvalidRefreshTokenException();
    }

    await this.sessionRepository.revokeAllByUserId(session.getUserId(), new Date());
  }
}
