import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "@shared/presentation/auth/roles.decorator";
import { PaginationQuery } from "@shared/presentation/query/pagination.query";
import { PaginationMeta } from "@shared/presentation/response/pagination-meta";
import { ApiPaginationResponse } from "@shared/presentation/response/pagination-response.decorator";
import { PaginationResponse } from "@shared/presentation/response/pagination.response";

import { CreateScopeCommand } from "@modules/oauth/application/command/create-scope.command";
import { ListScopesQuery } from "@modules/oauth/application/query/list-scopes.query";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { CreateScopeRequest } from "@modules/oauth/presentation/dto/v1/create-scope.request";
import { ScopeDto } from "@modules/oauth/presentation/dto/v1/scope.dto";
import {
  ApiScopeAlreadyExistsResponse,
  ApiScopeCreateValidationFailedResponse,
} from "@modules/oauth/presentation/exception-response.decorator";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import {
  ApiPaginationValidationFailedResponse,
  ApiUnexpectedErrorResponse,
} from "@modules/user/presentation/exception-response.decorator";
import { RoleType } from "@modules/user/user.module";

@ApiTags("scopes")
@Controller({ path: "scopes", version: "1" })
export class ScopeController {
  private readonly commandBus: CommandBus;
  private readonly queryBus: QueryBus;

  constructor(commandBus: CommandBus, queryBus: QueryBus) {
    this.commandBus = commandBus;
    this.queryBus = queryBus;
  }

  @Get()
  @ApiAuthenticatedResponse()
  @ApiPaginationResponse(ScopeDto, "Paginated list of scopes")
  @ApiPaginationValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
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
  @ApiAuthenticatedResponse()
  @ApiOperation({ description: "Requires admin role" })
  @ApiCreatedResponse({ type: ScopeDto, description: "Scope created" })
  @ApiInsufficientRoleResponse()
  @ApiScopeAlreadyExistsResponse()
  @ApiScopeCreateValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async create(
    @Body()
    request: CreateScopeRequest
  ): Promise<ScopeDto> {
    const scope = await this.commandBus.execute<CreateScopeCommand, Scope>(new CreateScopeCommand(request.name));
    return ScopeDto.fromDomain(scope);
  }
}
