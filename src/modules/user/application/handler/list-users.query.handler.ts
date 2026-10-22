import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { ListUsersQuery } from "@modules/user/application/query/list-users.query";
import type { User } from "@modules/user/domain/entity/user";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

@QueryHandler(ListUsersQuery)
@Injectable()
export class ListUsersQueryHandler implements IQueryHandler<ListUsersQuery> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  async execute(query: ListUsersQuery): Promise<{ items: User[]; total: number }> {
    const [items, total] = await Promise.all([
      this.userRepository.findAll({ limit: query.limit, offset: query.offset }),
      this.userRepository.count(),
    ]);

    return { items, total };
  }
}
