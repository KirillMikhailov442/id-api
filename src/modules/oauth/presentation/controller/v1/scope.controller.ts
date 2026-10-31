import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Roles } from "@shared/auth/decorator/roles.decorator";
import { PaginationMeta } from "@shared/pagination/pagination-meta";
import { PaginationQuery } from "@shared/pagination/pagination.query";
import { PaginationResponse } from "@shared/pagination/pagination.response";

import { CreateScopeCommand } from "@modules/oauth/application/command/create-scope.command";
import { ListScopesQuery } from "@modules/oauth/application/query/list-scopes.query";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { CreateScopeRequest } from "@modules/oauth/presentation/dto/v1/create-scope.request";
import { ScopeDto } from "@modules/oauth/presentation/dto/v1/scope.dto";
import { RoleType } from "@modules/user/user.module";

@Controller({ path: "scopes", version: "1" })
export class ScopeController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Get()
  async list(
    @Query()
    pagination: PaginationQuery
  ): Promise<PaginationResponse<ScopeDto>> {
    const query = new ListScopesQuery(pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<
      ListScopesQuery,
      {
        items: Scope[];
        total: number;
      }
    >(query);
    const scopes = items.map((scope) => ScopeDto.fromDomain(scope));

    return new PaginationResponse(scopes, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Post()
  @Roles(RoleType.Admin)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    request: CreateScopeRequest
  ): Promise<ScopeDto> {
    const scope = await this.commandBus.execute<CreateScopeCommand, Scope>(new CreateScopeCommand(request.name));

    return ScopeDto.fromDomain(scope);
  }
}
