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

  async execute(command: LogoutCommand): Promise<void> {
    const session = await this.sessionRepository.findByRefreshHash(this.refreshTokenService.hash(command.refreshToken));

    if (session === null || !session.isActive()) {
      throw new InvalidRefreshTokenException();
    }

    session.revoke();
    await this.sessionRepository.save(session);
  }
}
