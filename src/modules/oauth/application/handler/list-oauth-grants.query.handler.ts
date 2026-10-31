import { Inject } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import {
  OAUTH_GRANT_STORE,
  type IOAuthGrantStore,
  type OAuthGrantPage,
} from "@modules/oauth/application/port/oauth-grant-store";
import { ListOAuthGrantsQuery } from "@modules/oauth/application/query/list-oauth-grants.query";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY, UserNotFoundException, type IUserRepository } from "@modules/user/user.module";

@QueryHandler(ListOAuthGrantsQuery)
export class ListOAuthGrantsQueryHandler implements IQueryHandler<ListOAuthGrantsQuery> {
  constructor(
    @Inject(OAUTH_GRANT_STORE) private readonly grants: IOAuthGrantStore,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository
  ) {}

  async execute(query: ListOAuthGrantsQuery): Promise<OAuthGrantPage> {
    const userId = UserId.from(query.userId);

    if ((await this.users.findById(userId)) === null) {
      throw new UserNotFoundException();
    }

    return this.grants.listByUserId(userId, query.limit, query.offset);
  }
}
