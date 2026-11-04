import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { ISessionRepository, SessionPage } from "@modules/session/application/port/session-repository";
import { ListUserSessionsQuery } from "@modules/session/application/query/list-user-sessions.query";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

@QueryHandler(ListUserSessionsQuery)
@Injectable()
export class ListUserSessionsQueryHandler implements IQueryHandler<ListUserSessionsQuery> {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository
  ) {}

  execute(query: ListUserSessionsQuery): Promise<SessionPage> {
    return this.sessionRepository.findPageByUserId(
      UserId.from(query.userId),
      { limit: query.limit, offset: query.offset },
      { search: query.search, activeOnly: false }
    );
  }
}
