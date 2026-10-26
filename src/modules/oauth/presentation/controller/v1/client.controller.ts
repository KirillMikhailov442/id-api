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
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { RoleType } from "@modules/user/user.module";
import type { AuthenticatedUser } from "@shared/presentation/auth/authenticated-user.type";
import { CurrentUser } from "@shared/presentation/auth/current-user.decorator";
import { Roles } from "@shared/presentation/auth/roles.decorator";
import { PaginationQuery } from "@shared/presentation/query/pagination.query";
import { PaginationMeta } from "@shared/presentation/response/pagination-meta";
import { ApiPaginationResponse } from "@shared/presentation/response/pagination-response.decorator";
import { PaginationResponse } from "@shared/presentation/response/pagination.response";

import { AddLocationCommand } from "@modules/oauth/application/command/add-location.command";
import { AssignScopesCommand } from "@modules/oauth/application/command/assign-scopes.command";
import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import { DeleteClientCommand } from "@modules/oauth/application/command/delete-client.command";
import { RemoveLocationCommand } from "@modules/oauth/application/command/remove-location.command";
import { UnassignScopeCommand } from "@modules/oauth/application/command/unassign-scope.command";
import { UpdateClientCommand } from "@modules/oauth/application/command/update-client.command";
import type { CreateClientResult } from "@modules/oauth/application/handler/create-client.command.handler";
import { GetClientLocationsQuery } from "@modules/oauth/application/query/get-client-locations.query";
import { GetClientQuery } from "@modules/oauth/application/query/get-client.query";
import { ListAllClientsQuery } from "@modules/oauth/application/query/list-all-clients.query";
import { ListClientScopesQuery } from "@modules/oauth/application/query/list-client-scopes.query";
import { ListClientsQuery } from "@modules/oauth/application/query/list-clients.query";
import type { Requester } from "@modules/oauth/application/requester.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import type { Location } from "@modules/oauth/domain/entity/location";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { AddLocationRequest } from "@modules/oauth/presentation/dto/v1/add-location.request";
import { AssignScopesRequest } from "@modules/oauth/presentation/dto/v1/assign-scopes.request";
import { ClientLocationDto } from "@modules/oauth/presentation/dto/v1/client-location.dto";
import { ClientDto } from "@modules/oauth/presentation/dto/v1/client.dto";
import { CreateClientRequest } from "@modules/oauth/presentation/dto/v1/create-client.request";
import { CreateClientResponse } from "@modules/oauth/presentation/dto/v1/create-client.response";
import { ScopeDto } from "@modules/oauth/presentation/dto/v1/scope.dto";
import { UpdateClientRequest } from "@modules/oauth/presentation/dto/v1/update-client.request";
import {
  ApiClientAlreadyActiveResponse,
  ApiClientAlreadyInactiveResponse,
  ApiClientCreateValidationFailedResponse,
  ApiClientNotFoundResponse,
  ApiClientUpdateValidationFailedResponse,
  ApiInvalidClientIdResponse,
  ApiInvalidLocationIdResponse,
  ApiLocationNotFoundResponse,
  ApiLocationValidationFailedResponse,
  ApiScopeNotAssignedResponse,
  ApiScopeNotFoundResponse,
  ApiScopesValidationFailedResponse,
} from "@modules/oauth/presentation/exception-response.decorator";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import {
  ApiPaginationValidationFailedResponse,
  ApiUnexpectedErrorResponse,
} from "@modules/user/presentation/exception-response.decorator";

const toRequester = (authenticatedUser: AuthenticatedUser): Requester => ({
  userId: authenticatedUser.userId,
  roles: authenticatedUser.roles,
});

@ApiTags("clients")
@Controller({ path: "clients", version: "1" })
export class ClientController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiAuthenticatedResponse()
  @ApiCreatedResponse({ type: CreateClientResponse, description: "Client created with optional locations" })
  @ApiClientCreateValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() request: CreateClientRequest
  ): Promise<CreateClientResponse> {
    const command = new CreateClientCommand(toRequester(currentUser), request.name, request.secret, request.locations);
    const { client, locations } = await this.commandBus.execute<CreateClientCommand, CreateClientResult>(command);

    return new CreateClientResponse(
      ClientDto.fromDomain(client),
      locations.map((location) => ClientLocationDto.fromDomain(location))
    );
  }

  @Get()
  @ApiAuthenticatedResponse()
  @ApiPaginationResponse(ClientDto, "Paginated list of own clients")
  @ApiPaginationValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() pagination: PaginationQuery
  ): Promise<PaginationResponse<ClientDto>> {
    const query = new ListClientsQuery(toRequester(currentUser), pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<ListClientsQuery, { items: Client[]; total: number }>(query);
    const clients = items.map((client) => ClientDto.fromDomain(client));

    return new PaginationResponse(clients, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get("all")
  @Roles(RoleType.Admin)
  @ApiAuthenticatedResponse()
  @ApiOperation({ description: "Requires admin role" })
  @ApiPaginationResponse(ClientDto, "Paginated list of all clients")
  @ApiInsufficientRoleResponse()
  @ApiPaginationValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async listAll(@Query() pagination: PaginationQuery): Promise<PaginationResponse<ClientDto>> {
    const query = new ListAllClientsQuery(pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<ListAllClientsQuery, { items: Client[]; total: number }>(
      query
    );
    const clients = items.map((client) => ClientDto.fromDomain(client));

    return new PaginationResponse(clients, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get(":id")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: ClientDto, description: "Client found" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async get(@CurrentUser() currentUser: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string): Promise<ClientDto> {
    const client = await this.queryBus.execute<GetClientQuery, Client>(
      new GetClientQuery(toRequester(currentUser), id)
    );

    return ClientDto.fromDomain(client);
  }

  @Patch(":id")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: ClientDto, description: "Client updated" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiClientAlreadyActiveResponse()
  @ApiClientAlreadyInactiveResponse()
  @ApiClientUpdateValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() request: UpdateClientRequest
  ): Promise<ClientDto> {
    const command = new UpdateClientCommand(toRequester(currentUser), id, request.name, request.isActive);
    const client = await this.commandBus.execute<UpdateClientCommand, Client>(command);

    return ClientDto.fromDomain(client);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticatedResponse()
  @ApiNoContentResponse({ description: "Client deleted" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async delete(@CurrentUser() currentUser: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute<DeleteClientCommand, Client>(new DeleteClientCommand(toRequester(currentUser), id));
  }

  @Get(":id/locations")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: [ClientLocationDto], description: "Client locations" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async listLocations(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ClientLocationDto[]> {
    const locations = await this.queryBus.execute<GetClientLocationsQuery, Location[]>(
      new GetClientLocationsQuery(toRequester(currentUser), id)
    );

    return locations.map((location) => ClientLocationDto.fromDomain(location));
  }

  @Post(":id/locations")
  @ApiAuthenticatedResponse()
  @ApiCreatedResponse({ type: ClientLocationDto, description: "Location added" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiLocationValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async addLocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() request: AddLocationRequest
  ): Promise<ClientLocationDto> {
    const command = new AddLocationCommand(toRequester(currentUser), id, request.href);
    const location = await this.commandBus.execute<AddLocationCommand, Location>(command);

    return ClientLocationDto.fromDomain(location);
  }

  @Delete(":id/locations/:locationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticatedResponse()
  @ApiNoContentResponse({ description: "Location removed" })
  @ApiInvalidClientIdResponse()
  @ApiInvalidLocationIdResponse()
  @ApiClientNotFoundResponse()
  @ApiLocationNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async removeLocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("locationId", ParseUUIDPipe) locationId: string
  ): Promise<void> {
    await this.commandBus.execute<RemoveLocationCommand, void>(
      new RemoveLocationCommand(toRequester(currentUser), id, locationId)
    );
  }

  @Get(":id/scopes")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: [ScopeDto], description: "Scopes assigned to the client" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async listScopes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ScopeDto[]> {
    const scopes = await this.queryBus.execute<ListClientScopesQuery, Scope[]>(
      new ListClientScopesQuery(toRequester(currentUser), id)
    );

    return scopes.map((scope) => ScopeDto.fromDomain(scope));
  }

  @Put(":id/scopes")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: [ScopeDto], description: "Full set of scopes assigned to the client" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiScopeNotFoundResponse()
  @ApiScopesValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async assignScopes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() request: AssignScopesRequest
  ): Promise<ScopeDto[]> {
    const command = new AssignScopesCommand(toRequester(currentUser), id, request.scopes);
    const scopes = await this.commandBus.execute<AssignScopesCommand, Scope[]>(command);

    return scopes.map((scope) => ScopeDto.fromDomain(scope));
  }

  @Delete(":id/scopes/:name")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticatedResponse()
  @ApiNoContentResponse({ description: "Scope unassigned" })
  @ApiInvalidClientIdResponse()
  @ApiClientNotFoundResponse()
  @ApiScopeNotFoundResponse()
  @ApiScopeNotAssignedResponse()
  @ApiUnexpectedErrorResponse()
  async unassignScope(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("name") name: string
  ): Promise<void> {
    await this.commandBus.execute<UnassignScopeCommand, void>(
      new UnassignScopeCommand(toRequester(currentUser), id, name)
    );
  }
}
