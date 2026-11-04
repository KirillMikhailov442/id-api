import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { ISessionRepository, SessionPage } from "@modules/session/application/port/session-repository";
import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

@QueryHandler(ListActiveSessionsQuery)
@Injectable()
export class ListActiveSessionsQueryHandler implements IQueryHandler<ListActiveSessionsQuery> {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository
  ) {}

  execute(query: ListActiveSessionsQuery): Promise<SessionPage> {
    return this.sessionRepository.findPageByUserId(
      UserId.from(query.userId),
      { limit: query.limit, offset: query.offset },
      { search: query.search, activeOnly: true }
    );
  }
}
