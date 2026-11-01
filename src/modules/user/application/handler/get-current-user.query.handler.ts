import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { GetCurrentUserQuery } from "@modules/user/application/query/get-current-user.query";
import type { User } from "@modules/user/domain/entity/user";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

@QueryHandler(GetCurrentUserQuery)
@Injectable()
export class GetCurrentUserQueryHandler implements IQueryHandler<GetCurrentUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: GetCurrentUserQuery): Promise<User> {
    const userId = UserId.from(query.userId);

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
