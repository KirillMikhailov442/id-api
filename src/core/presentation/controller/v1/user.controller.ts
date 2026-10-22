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
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { LoginCommand, type LoginResult } from "@modules/auth/application/command/login.command";

import { BlockUserCommand } from "@core/application/command/block-user.command";
import { ConfirmEmailCommand } from "@core/application/command/confirm-email.command";
import { CreateUserCommand } from "@core/application/command/create-user.command";
import { DeleteUserCommand } from "@core/application/command/delete-user.command";
import { UnblockUserCommand } from "@core/application/command/unblock-user.command";
import { UpdateUserCommand } from "@core/application/command/update-user.command";
import { GetUserQuery } from "@core/application/query/get-user.query";
import { ListUsersQuery } from "@core/application/query/list-users.query";
import type { User } from "@core/domain/entity/user";
import { RoleType } from "@core/domain/enum/role-type.enum";
import { ConfirmEmailQuery } from "@core/presentation/dto/v1/confirm-email.query";
import { CreateUserRequest } from "@core/presentation/dto/v1/create-user.request";
import { CreateUserResponse } from "@core/presentation/dto/v1/create-user.response";
import { UpdateUserRequest } from "@core/presentation/dto/v1/update-user.request";
import { UserDto } from "@core/presentation/dto/v1/user.dto";
import {
  ApiCreateValidationFailedResponse,
  ApiEmailAlreadyConfirmedResponse,
  ApiEmailAlreadyRegisteredResponse,
  ApiInvalidEmailConfirmationTokenResponse,
  ApiInvalidUserIdResponse,
  ApiPaginationValidationFailedResponse,
  ApiUnexpectedErrorResponse,
  ApiUpdateValidationFailedResponse,
  ApiUserAlreadyBlockedResponse,
  ApiUserAlreadyUnblockedResponse,
  ApiUserNotFoundResponse,
} from "@core/presentation/exception-response.decorator";
import type { AuthenticatedUser } from "@core/shared/presentation/auth/authenticated-user.type";
import { CurrentUser } from "@core/shared/presentation/auth/current-user.decorator";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@core/shared/presentation/auth/exception-response.decorator";
import { Public } from "@core/shared/presentation/auth/public.decorator";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@core/shared/presentation/auth/refresh-cookie.options";
import { Roles } from "@core/shared/presentation/auth/roles.decorator";
import { PaginationQuery } from "@core/shared/presentation/query/pagination.query";
import { PaginationMeta } from "@core/shared/presentation/response/pagination-meta";
import { ApiPaginationResponse } from "@core/shared/presentation/response/pagination-response.decorator";
import { PaginationResponse } from "@core/shared/presentation/response/pagination.response";

const UNKNOWN_VALUE = "unknown";

@ApiTags("users")
@Controller({ path: "users", version: "1" })
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({
    type: CreateUserResponse,
    description: "User created. Refresh token is set as httpOnly cookie 'refresh_token'",
  })
  @ApiEmailAlreadyRegisteredResponse()
  @ApiCreateValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async create(
    @Body() request: CreateUserRequest,
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) httpResponse: Response
  ): Promise<CreateUserResponse> {
    const command = new CreateUserCommand(request.name, request.surname, request.email, request.password);
    const user = await this.commandBus.execute<CreateUserCommand, User>(command);

    const loginCommand = new LoginCommand(
      request.email,
      request.password,
      httpRequest.headers["user-agent"] ?? UNKNOWN_VALUE,
      httpRequest.ip ?? UNKNOWN_VALUE
    );
    const result = await this.commandBus.execute<LoginCommand, LoginResult>(loginCommand);

    httpResponse.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions(this.configService));

    return new CreateUserResponse(UserDto.fromDomain(user), result.accessToken);
  }

  @Get()
  @ApiAuthenticatedResponse()
  @ApiPaginationResponse(UserDto, "Paginated list of users")
  @ApiPaginationValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async list(@Query() pagination: PaginationQuery): Promise<PaginationResponse<UserDto>> {
    const query = new ListUsersQuery(pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<ListUsersQuery, { items: User[]; total: number }>(query);
    const users = items.map((user) => UserDto.fromDomain(user));

    return new PaginationResponse(users, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get("me")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: UserDto, description: "Current user profile" })
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserDto> {
    const user = await this.queryBus.execute<GetUserQuery, User>(new GetUserQuery(currentUser.userId));

    return UserDto.fromDomain(user);
  }

  @Put("me")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: UserDto, description: "Current user updated" })
  @ApiUpdateValidationFailedResponse()
  @ApiEmailAlreadyRegisteredResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() request: UpdateUserRequest): Promise<UserDto> {
    const command = new UpdateUserCommand(currentUser.userId, request.name, request.surname, request.email);
    const user = await this.commandBus.execute<UpdateUserCommand, User>(command);

    return UserDto.fromDomain(user);
  }

  @Public()
  @Get("confirm-email")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: UserDto, description: "Email confirmed" })
  @ApiInvalidEmailConfirmationTokenResponse()
  @ApiEmailAlreadyConfirmedResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async confirmEmail(@Query() query: ConfirmEmailQuery): Promise<UserDto> {
    const user = await this.commandBus.execute<ConfirmEmailCommand, User>(new ConfirmEmailCommand(query.token));

    return UserDto.fromDomain(user);
  }

  @Get(":id")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: UserDto, description: "User found" })
  @ApiInvalidUserIdResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async get(@Param("id", ParseUUIDPipe) id: string): Promise<UserDto> {
    const query = new GetUserQuery(id);
    const user = await this.queryBus.execute<GetUserQuery, User>(query);

    return UserDto.fromDomain(user);
  }

  @Roles(RoleType.Admin)
  @Put(":id")
  @ApiAuthenticatedResponse()
  @ApiOperation({ description: "Requires admin role" })
  @ApiOkResponse({ type: UserDto, description: "User updated" })
  @ApiInsufficientRoleResponse()
  @ApiInvalidUserIdResponse()
  @ApiEmailAlreadyRegisteredResponse()
  @ApiUpdateValidationFailedResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() request: UpdateUserRequest): Promise<UserDto> {
    const command = new UpdateUserCommand(id, request.name, request.surname, request.email);
    const user = await this.commandBus.execute<UpdateUserCommand, User>(command);

    return UserDto.fromDomain(user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticatedResponse()
  @ApiNoContentResponse({ description: "User deleted" })
  @ApiInvalidUserIdResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand(id));
  }

  @Roles(RoleType.Admin)
  @Patch(":id/block")
  @ApiAuthenticatedResponse()
  @ApiOperation({ description: "Requires admin role" })
  @ApiOkResponse({ type: UserDto, description: "User blocked" })
  @ApiInsufficientRoleResponse()
  @ApiInvalidUserIdResponse()
  @ApiUserAlreadyBlockedResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async block(@Param("id", ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.commandBus.execute<BlockUserCommand, User>(new BlockUserCommand(id));

    return UserDto.fromDomain(user);
  }

  @Roles(RoleType.Admin)
  @Patch(":id/unblock")
  @ApiAuthenticatedResponse()
  @ApiOperation({ description: "Requires admin role" })
  @ApiOkResponse({ type: UserDto, description: "User unblocked" })
  @ApiInsufficientRoleResponse()
  @ApiInvalidUserIdResponse()
  @ApiUserAlreadyUnblockedResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async unblock(@Param("id", ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.commandBus.execute<UnblockUserCommand, User>(new UnblockUserCommand(id));

    return UserDto.fromDomain(user);
  }
}
