import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import { GetRoleQuery } from "@modules/user/application/query/get-role.query";
import type { Role } from "@modules/user/domain/entity/role";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { RoleId } from "@modules/user/user.ids";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

@QueryHandler(GetRoleQuery)
@Injectable()
export class GetRoleQueryHandler implements IQueryHandler<GetRoleQuery> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: GetRoleQuery): Promise<Role> {
    const roleId = RoleId.from(query.roleId);

    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new RoleNotFoundException();
    }

    return role;
  }
}
