import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { SUPER_USER_EMAIL, type User } from "@modules/user/domain/entity/user";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

@QueryHandler(GetUserQuery)
@Injectable()
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: GetUserQuery): Promise<User> {
    const userId = UserId.from(query.userId);

    const user = await this.userRepository.findById(userId);

    if (!user || (!query.includeSuperUser && user.getEmail().getValue() === SUPER_USER_EMAIL)) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
