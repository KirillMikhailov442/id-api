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
import { DeviceInfoParser } from "@shared/infrastructure/device/device-info-parser";
import type { AuthenticatedUser } from "@shared/presentation/auth/authenticated-user.type";
import { CurrentUser } from "@shared/presentation/auth/current-user.decorator";
import { Public } from "@shared/presentation/auth/public.decorator";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/presentation/auth/refresh-cookie.options";
import { Roles } from "@shared/presentation/auth/roles.decorator";
import { PaginationQuery } from "@shared/presentation/query/pagination.query";
import { PaginationMeta } from "@shared/presentation/response/pagination-meta";
import { ApiPaginationResponse } from "@shared/presentation/response/pagination-response.decorator";
import { PaginationResponse } from "@shared/presentation/response/pagination.response";
import type { Request, Response } from "express";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import { BlockUserCommand } from "@modules/user/application/command/block-user.command";
import { ConfirmEmailCommand } from "@modules/user/application/command/confirm-email.command";
import { CreateUserCommand } from "@modules/user/application/command/create-user.command";
import { DeleteUserCommand } from "@modules/user/application/command/delete-user.command";
import { UnblockUserCommand } from "@modules/user/application/command/unblock-user.command";
import { UpdateUserCommand } from "@modules/user/application/command/update-user.command";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { ListUsersQuery } from "@modules/user/application/query/list-users.query";
import type { User } from "@modules/user/domain/entity/user";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { BlockUserRequest } from "@modules/user/presentation/dto/v1/block-user.request";
import { ConfirmEmailQuery } from "@modules/user/presentation/dto/v1/confirm-email.query";
import { CreateUserRequest } from "@modules/user/presentation/dto/v1/create-user.request";
import { CreateUserResponse } from "@modules/user/presentation/dto/v1/create-user.response";
import { UpdateUserRequest } from "@modules/user/presentation/dto/v1/update-user.request";
import { UserDto } from "@modules/user/presentation/dto/v1/user.dto";
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
} from "@modules/user/presentation/exception-response.decorator";

const UNKNOWN_VALUE = "unknown";

@ApiTags("users")
@Controller({ path: "users", version: "1" })
export class UserController {
  private readonly commandBus: CommandBus;
  private readonly queryBus: QueryBus;
  private readonly configService: ConfigService;
  private readonly deviceInfoParser: DeviceInfoParser;

  constructor(
    commandBus: CommandBus,
    queryBus: QueryBus,
    configService: ConfigService,
    deviceInfoParser: DeviceInfoParser
  ) {
    this.commandBus = commandBus;
    this.queryBus = queryBus;
    this.configService = configService;
    this.deviceInfoParser = deviceInfoParser;
  }

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiCreatedResponse({
    type: CreateUserResponse,
    description: "User created. Refresh token is set as httpOnly cookie 'refresh_token'",
  })
  @ApiEmailAlreadyRegisteredResponse()
  @ApiCreateValidationFailedResponse()
  @ApiUnexpectedErrorResponse()
  async create(
    @Body()
    request: CreateUserRequest,
    @Req()
    httpRequest: Request,
    @Res({ passthrough: true })
    httpResponse: Response
  ): Promise<CreateUserResponse> {
    const command = new CreateUserCommand(request.name, request.surname, request.email, request.password);
    const user = await this.commandBus.execute<CreateUserCommand, User>(command);
    const loginCommand = new LoginCommand(
      request.email,
      request.password,
      this.deviceInfoParser.parse(httpRequest.headers),
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
  async list(
    @Query()
    pagination: PaginationQuery
  ): Promise<PaginationResponse<UserDto>> {
    const query = new ListUsersQuery(pagination.limit, pagination.offset);
    const { items, total } = await this.queryBus.execute<
      ListUsersQuery,
      {
        items: User[];
        total: number;
      }
    >(query);
    const users = items.map((user) => UserDto.fromDomain(user));
    return new PaginationResponse(users, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get("me")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: UserDto, description: "Current user profile" })
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async me(
    @CurrentUser()
    currentUser: AuthenticatedUser
  ): Promise<UserDto> {
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
  async updateMe(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    request: UpdateUserRequest
  ): Promise<UserDto> {
    const command = new UpdateUserCommand(currentUser.userId, request.name, request.surname, request.email);
    const user = await this.commandBus.execute<UpdateUserCommand, User>(command);
    return UserDto.fromDomain(user);
  }

  @Public()
  @Get("confirm-email")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOkResponse({ type: UserDto, description: "Email confirmed" })
  @ApiInvalidEmailConfirmationTokenResponse()
  @ApiEmailAlreadyConfirmedResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async confirmEmail(
    @Query()
    query: ConfirmEmailQuery
  ): Promise<UserDto> {
    const user = await this.commandBus.execute<ConfirmEmailCommand, User>(new ConfirmEmailCommand(query.token));
    return UserDto.fromDomain(user);
  }

  @Get(":id")
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: UserDto, description: "User found" })
  @ApiInvalidUserIdResponse()
  @ApiUserNotFoundResponse()
  @ApiUnexpectedErrorResponse()
  async get(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<UserDto> {
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
  async update(
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body()
    request: UpdateUserRequest
  ): Promise<UserDto> {
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
  async delete(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<void> {
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
  async block(
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body()
    request?: BlockUserRequest
  ): Promise<UserDto> {
    const user = await this.commandBus.execute<BlockUserCommand, User>(new BlockUserCommand(id, request?.reason));
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
  async unblock(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<UserDto> {
    const user = await this.commandBus.execute<UnblockUserCommand, User>(new UnblockUserCommand(id));
    return UserDto.fromDomain(user);
  }
}
