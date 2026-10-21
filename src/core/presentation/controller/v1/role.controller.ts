import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { CreateRoleCommand } from "@core/application/command/create-role.command";
import { DeleteRoleCommand } from "@core/application/command/delete-role.command";
import { UpdateRoleCommand } from "@core/application/command/update-role.command";
import { GetRoleQuery } from "@core/application/query/get-role.query";
import { ListRolesQuery } from "@core/application/query/list-roles.query";
import type { Role } from "@core/domain/entity/role";
import { RoleType } from "@core/domain/enum/role-type.enum";
import { CreateRoleRequest } from "@core/presentation/dto/v1/create-role.request";
import { RoleDto } from "@core/presentation/dto/v1/role.dto";
import { UpdateRoleRequest } from "@core/presentation/dto/v1/update-role.request";
import {
  ApiInvalidRoleIdResponse,
  ApiRoleAlreadyExistsResponse,
  ApiRoleCreateValidationFailedResponse,
  ApiRoleNotFoundResponse,
  ApiRoleUpdateValidationFailedResponse,
  ApiUnexpectedErrorResponse,
} from "@core/presentation/exception-response.decorator";
import {
  ApiAccessTokenExpiredResponse,
  ApiInsufficientRoleResponse,
  ApiInvalidAccessTokenResponse,
} from "@core/shared/presentation/auth/exception-response.decorator";
import { Roles } from "@core/shared/presentation/auth/roles.decorator";

@ApiTags("roles")
@ApiBearerAuth()
@ApiInvalidAccessTokenResponse()
@ApiAccessTokenExpiredResponse()
@ApiInsufficientRoleResponse()
@Roles(RoleType.Admin)
@Controller({ path: "roles", version: "1" })
export class RoleController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ description: "Requires admin role" })
  @ApiCreatedResponse({ type: RoleDto, description: "Role created" })
  @ApiRoleAlreadyExistsResponse()
  @ApiRoleCreateValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async create(@Body() request: CreateRoleRequest): Promise<RoleDto> {
    const role = await this.commandBus.execute<CreateRoleCommand, Role>(new CreateRoleCommand(request.name));

    return RoleDto.fromDomain(role);
  }

  @Get()
  @ApiOperation({ description: "Requires admin role" })
  @ApiOkResponse({ type: [RoleDto], description: "List of roles" })
  @ApiUnexpectedErrorResponse()
  async list(): Promise<RoleDto[]> {
    const roles = await this.queryBus.execute<ListRolesQuery, Role[]>(new ListRolesQuery());

    return roles.map((role) => RoleDto.fromDomain(role));
  }

  @Get(":id")
  @ApiOperation({ description: "Requires admin role" })
  @ApiOkResponse({ type: RoleDto, description: "Role found" })
  @ApiInvalidRoleIdResponse()
  @ApiRoleNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async get(@Param("id", ParseUUIDPipe) id: string): Promise<RoleDto> {
    const role = await this.queryBus.execute<GetRoleQuery, Role>(new GetRoleQuery(id));

    return RoleDto.fromDomain(role);
  }

  @Put(":id")
  @ApiOperation({ description: "Requires admin role" })
  @ApiOkResponse({ type: RoleDto, description: "Role updated" })
  @ApiInvalidRoleIdResponse()
  @ApiRoleAlreadyExistsResponse()
  @ApiRoleUpdateValidationFailedResponse()
  @ApiRoleNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() request: UpdateRoleRequest): Promise<RoleDto> {
    const role = await this.commandBus.execute<UpdateRoleCommand, Role>(new UpdateRoleCommand(id, request.name));

    return RoleDto.fromDomain(role);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ description: "Requires admin role" })
  @ApiNoContentResponse({ description: "Role deleted" })
  @ApiInvalidRoleIdResponse()
  @ApiRoleNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute<DeleteRoleCommand, void>(new DeleteRoleCommand(id));
  }
}
