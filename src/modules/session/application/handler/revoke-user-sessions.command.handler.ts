import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { RevokeUserSessionsCommand } from "@modules/session/application/command/revoke-user-sessions.command";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

@CommandHandler(RevokeUserSessionsCommand)
@Injectable()
export class RevokeUserSessionsCommandHandler implements ICommandHandler<RevokeUserSessionsCommand> {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(command: RevokeUserSessionsCommand): Promise<void> {
    const userId = UserId.from(command.userId);

    await this.sessionRepository.withUserLock(userId, async (repository) => {
      await repository.revokeAllByUserId(userId, new Date());
    });
  }
}
