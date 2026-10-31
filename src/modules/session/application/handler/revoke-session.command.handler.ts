import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { SessionNotFoundException } from "@modules/session/domain/exception/session-not-found.exception";
import { SessionId } from "@modules/session/session.ids";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

@CommandHandler(RevokeSessionCommand)
@Injectable()
export class RevokeSessionCommandHandler implements ICommandHandler<RevokeSessionCommand> {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(command: RevokeSessionCommand): Promise<void> {
    const userId = UserId.from(command.userId);
    const sessionId = SessionId.from(command.sessionId);

    await this.sessionRepository.withUserLock(userId, async (repository) => {
      const revoked = await repository.revokeByIdAndUserId(sessionId, userId, new Date());

      if (!revoked) {
        throw new SessionNotFoundException();
      }
    });
  }
}
