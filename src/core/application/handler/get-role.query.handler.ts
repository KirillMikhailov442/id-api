import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IRoleRepository } from "@core/application/port/role-repository";
import { GetRoleQuery } from "@core/application/query/get-role.query";
import { ROLE_REPOSITORY } from "@core/core.tokens";
import type { Role } from "@core/domain/entity/role";
import { RoleNotFoundException } from "@core/domain/exception/role-not-found.exception";

@QueryHandler(GetRoleQuery)
@Injectable()
export class GetRoleQueryHandler implements IQueryHandler<GetRoleQuery> {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository) {}

  async execute(query: GetRoleQuery): Promise<Role> {
    const role = await this.roleRepository.findById(query.roleId);

    if (!role) {
      throw new RoleNotFoundException();
    }

    return role;
  }
}
