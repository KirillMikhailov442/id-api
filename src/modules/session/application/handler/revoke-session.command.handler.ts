import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { SessionNotFoundException } from "@modules/session/domain/exception/session-not-found.exception";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";

@CommandHandler(RevokeSessionCommand)
@Injectable()
export class RevokeSessionCommandHandler implements ICommandHandler<RevokeSessionCommand> {
  private readonly sessionRepository: ISessionRepository;

  constructor(
    @Inject(SESSION_REPOSITORY)
    sessionRepository: ISessionRepository
  ) {
    this.sessionRepository = sessionRepository;
  }

  async execute(command: RevokeSessionCommand): Promise<void> {
    const revoked = await this.sessionRepository.revokeByIdAndUserId(command.sessionId, command.userId, new Date());

    if (!revoked) {
      throw new SessionNotFoundException();
    }
  }
}
