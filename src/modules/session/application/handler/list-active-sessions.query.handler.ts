import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import type { Session } from "@modules/session/domain/entity/session";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";

@QueryHandler(ListActiveSessionsQuery)
@Injectable()
export class ListActiveSessionsQueryHandler implements IQueryHandler<ListActiveSessionsQuery> {
  private readonly sessionRepository: ISessionRepository;

  constructor(
    @Inject(SESSION_REPOSITORY)
    sessionRepository: ISessionRepository
  ) {
    this.sessionRepository = sessionRepository;
  }

  execute(query: ListActiveSessionsQuery): Promise<Session[]> {
    return this.sessionRepository.findActiveByUserId(query.userId);
  }
}
