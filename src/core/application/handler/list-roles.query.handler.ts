import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IRoleRepository } from "@core/application/port/role-repository";
import { ListRolesQuery } from "@core/application/query/list-roles.query";
import { ROLE_REPOSITORY } from "@core/core.tokens";
import type { Role } from "@core/domain/entity/role";

@QueryHandler(ListRolesQuery)
@Injectable()
export class ListRolesQueryHandler implements IQueryHandler<ListRolesQuery> {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository) {}

  async execute(_query: ListRolesQuery): Promise<Role[]> {
    return this.roleRepository.findAll();
  }
}
