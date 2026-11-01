import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import type { User } from "@modules/user/domain/entity/user";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
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

    if (!user) {
      throw new UserNotFoundException();
    }

    const requesterIsSuperUser = query.requesterRoles.includes(RoleType.SuperUser);
    const targetIsSuperUser = user.getRoles().some((role) => role.getRoleName().getValue() === RoleType.SuperUser);

    if (targetIsSuperUser && !requesterIsSuperUser) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
