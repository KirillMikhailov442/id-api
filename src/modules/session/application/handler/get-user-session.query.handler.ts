import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { GetUserSessionQuery } from "@modules/session/application/query/get-user-session.query";
import type { Session } from "@modules/session/domain/entity/session";
import { SessionNotFoundException } from "@modules/session/domain/exception/session-not-found.exception";
import { SessionId } from "@modules/session/session.ids";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

@QueryHandler(GetUserSessionQuery)
@Injectable()
export class GetUserSessionQueryHandler implements IQueryHandler<GetUserSessionQuery> {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(query: GetUserSessionQuery): Promise<Session> {
    const session = await this.sessionRepository.findById(SessionId.from(query.sessionId));

    if (session === null || !session.getUserId().equals(UserId.from(query.userId))) {
      throw new SessionNotFoundException();
    }

    return session;
  }
}
