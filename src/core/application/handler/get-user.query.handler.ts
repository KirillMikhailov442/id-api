import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IUserRepository } from "@core/application/port/user-repository";
import { GetUserQuery } from "@core/application/query/get-user.query";
import { USER_REPOSITORY } from "@core/core.tokens";
import type { User } from "@core/domain/entity/user";
import { UserNotFoundException } from "@core/domain/exception/user-not-found.exception";

@QueryHandler(GetUserQuery)
@Injectable()
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserQuery): Promise<User> {
    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
