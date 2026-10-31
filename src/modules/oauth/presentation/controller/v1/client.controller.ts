import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { CurrentUser } from "@shared/auth/decorator/current-user.decorator";
import { Roles } from "@shared/auth/decorator/roles.decorator";
import { PaginationMeta } from "@shared/pagination/pagination-meta";
import { PaginationQuery } from "@shared/pagination/pagination.query";
import { PaginationResponse } from "@shared/pagination/pagination.response";

import { AssignScopesCommand } from "@modules/oauth/application/command/assign-scopes.command";
import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import { DeleteClientCommand } from "@modules/oauth/application/command/delete-client.command";
import { UnassignScopeCommand } from "@modules/oauth/application/command/unassign-scope.command";
import { UpdateClientCommand } from "@modules/oauth/application/command/update-client.command";
import { GetClientQuery } from "@modules/oauth/application/query/get-client.query";
import { ListAllClientsQuery } from "@modules/oauth/application/query/list-all-clients.query";
import { ListClientScopesQuery } from "@modules/oauth/application/query/list-client-scopes.query";
import { ListClientsQuery } from "@modules/oauth/application/query/list-clients.query";
import type { Requester } from "@modules/oauth/application/type/requester.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { AssignScopesRequest } from "@modules/oauth/presentation/dto/v1/assign-scopes.request";
import { ClientDto } from "@modules/oauth/presentation/dto/v1/client.dto";
import { CreateClientRequest } from "@modules/oauth/presentation/dto/v1/create-client.request";
import { ScopeDto } from "@modules/oauth/presentation/dto/v1/scope.dto";
import { UpdateClientRequest } from "@modules/oauth/presentation/dto/v1/update-client.request";
import { RoleType } from "@modules/user/user.module";

const toRequester = (authenticatedUser: AuthenticatedUser): Requester => ({
  userId: authenticatedUser.userId,
  roles: authenticatedUser.roles,
});

@Controller({ path: "clients", version: "1" })
export class ClientController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    request: CreateClientRequest
  ): Promise<ClientDto> {
    const command = new CreateClientCommand(
      toRequester(currentUser),
      request.name,
      request.secret,
      request.location,
      request.scopes
    );
    const client = await this.commandBus.execute<CreateClientCommand, Client>(command);

    return ClientDto.fromDomain(client);
  }

  @Get()
  async list(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Query()
    pagination: PaginationQuery
  ): Promise<PaginationResponse<ClientDto>> {
    const query = new ListClientsQuery(toRequester(currentUser), pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<
      ListClientsQuery,
      {
        items: Client[];
        total: number;
      }
    >(query);
    const clients = items.map((client) => ClientDto.fromDomain(client));

    return new PaginationResponse(clients, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get("all")
  @Roles(RoleType.Admin)
  async listAll(
    @Query()
    pagination: PaginationQuery
  ): Promise<PaginationResponse<ClientDto>> {
    const query = new ListAllClientsQuery(pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<
      ListAllClientsQuery,
      {
        items: Client[];
        total: number;
      }
    >(query);
    const clients = items.map((client) => ClientDto.fromDomain(client));

    return new PaginationResponse(clients, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get(":id")
  async get(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<ClientDto> {
    const client = await this.queryBus.execute<GetClientQuery, Client>(
      new GetClientQuery(toRequester(currentUser), id)
    );

    return ClientDto.fromDomain(client);
  }

  @Patch(":id")
  async update(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body()
    request: UpdateClientRequest
  ): Promise<ClientDto> {
    const command = new UpdateClientCommand(
      toRequester(currentUser),
      id,
      request.name,
      request.isActive,
      request.location
    );
    const client = await this.commandBus.execute<UpdateClientCommand, Client>(command);

    return ClientDto.fromDomain(client);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<void> {
    await this.commandBus.execute<DeleteClientCommand, Client>(new DeleteClientCommand(toRequester(currentUser), id));
  }

  @Get(":id/scopes")
  async listScopes(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<ScopeDto[]> {
    const scopes = await this.queryBus.execute<ListClientScopesQuery, Scope[]>(
      new ListClientScopesQuery(toRequester(currentUser), id)
    );

    return scopes.map((scope) => ScopeDto.fromDomain(scope));
  }

  @Put(":id/scopes")
  async assignScopes(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body()
    request: AssignScopesRequest
  ): Promise<ScopeDto[]> {
    const command = new AssignScopesCommand(toRequester(currentUser), id, request.scopes);
    const scopes = await this.commandBus.execute<AssignScopesCommand, Scope[]>(command);

    return scopes.map((scope) => ScopeDto.fromDomain(scope));
  }

  @Delete(":id/scopes/:name")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignScope(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    id: string,
    @Param("name")
    name: string
  ): Promise<void> {
    await this.commandBus.execute<UnassignScopeCommand, void>(
      new UnassignScopeCommand(toRequester(currentUser), id, name)
    );
  }
}
