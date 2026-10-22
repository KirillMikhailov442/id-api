import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import { ListRolesQuery } from "@modules/user/application/query/list-roles.query";
import type { Role } from "@modules/user/domain/entity/role";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

@QueryHandler(ListRolesQuery)
@Injectable()
export class ListRolesQueryHandler implements IQueryHandler<ListRolesQuery> {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository) {}

  async execute(_query: ListRolesQuery): Promise<Role[]> {
    return this.roleRepository.findAll();
  }
}
