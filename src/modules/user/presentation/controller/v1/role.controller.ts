import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Roles } from "@shared/auth/decorator/roles.decorator";

import { CreateRoleCommand } from "@modules/user/application/command/create-role.command";
import { DeleteRoleCommand } from "@modules/user/application/command/delete-role.command";
import { UpdateRoleCommand } from "@modules/user/application/command/update-role.command";
import { GetRoleQuery } from "@modules/user/application/query/get-role.query";
import { ListRolesQuery } from "@modules/user/application/query/list-roles.query";
import type { Role } from "@modules/user/domain/entity/role";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { CreateRoleRequest } from "@modules/user/presentation/dto/v1/create-role.request";
import { RoleDto } from "@modules/user/presentation/dto/v1/role.dto";
import { UpdateRoleRequest } from "@modules/user/presentation/dto/v1/update-role.request";

@Roles(RoleType.Admin)
@Controller({ path: "roles", version: "1" })
export class RoleController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  async create(
    @Body()
    request: CreateRoleRequest
  ): Promise<RoleDto> {
    const role = await this.commandBus.execute<CreateRoleCommand, Role>(new CreateRoleCommand(request.name));

    return RoleDto.fromDomain(role);
  }

  @Get()
  async list(): Promise<RoleDto[]> {
    const roles = await this.queryBus.execute<ListRolesQuery, Role[]>(new ListRolesQuery());

    return roles.map((role) => RoleDto.fromDomain(role));
  }

  @Get(":id")
  async get(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<RoleDto> {
    const role = await this.queryBus.execute<GetRoleQuery, Role>(new GetRoleQuery(id));

    return RoleDto.fromDomain(role);
  }

  @Put(":id")
  async update(
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body()
    request: UpdateRoleRequest
  ): Promise<RoleDto> {
    const role = await this.commandBus.execute<UpdateRoleCommand, Role>(new UpdateRoleCommand(id, request.name));

    return RoleDto.fromDomain(role);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<void> {
    await this.commandBus.execute<DeleteRoleCommand, void>(new DeleteRoleCommand(id));
  }
}
