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
import { Throttle } from "@nestjs/throttler";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/auth/cookie/refresh-cookie.options";
import { CurrentAuth } from "@shared/auth/decorator/current-auth.decorator";
import { CurrentUser } from "@shared/auth/decorator/current-user.decorator";
import { OAuthAccessToken } from "@shared/auth/decorator/oauth-access-token.decorator";
import { Public } from "@shared/auth/decorator/public.decorator";
import { Roles } from "@shared/auth/decorator/roles.decorator";
import { SessionAccessToken } from "@shared/auth/decorator/session-access-token.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { PaginationMeta } from "@shared/pagination/pagination-meta";
import { PaginationQuery } from "@shared/pagination/pagination.query";
import { PaginationResponse } from "@shared/pagination/pagination.response";
import type { Request, Response } from "express";

import { OAuthScope } from "@modules/oauth/oauth.scopes";
import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import { DeviceInfoParser } from "@modules/session/device-info.module";
import { BlockUserCommand } from "@modules/user/application/command/block-user.command";
import { ChangePasswordCommand } from "@modules/user/application/command/change-password.command";
import { ConfirmEmailCommand } from "@modules/user/application/command/confirm-email.command";
import { CreateUserCommand } from "@modules/user/application/command/create-user.command";
import { DeleteUserCommand } from "@modules/user/application/command/delete-user.command";
import { UnblockUserCommand } from "@modules/user/application/command/unblock-user.command";
import { UpdateUserCommand } from "@modules/user/application/command/update-user.command";
import { ProfileAccessPolicy } from "@modules/user/application/profile-access.policy";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { ListUsersQuery } from "@modules/user/application/query/list-users.query";
import type { User } from "@modules/user/domain/entity/user";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { BlockUserRequest } from "@modules/user/presentation/dto/v1/block-user.request";
import { ChangePasswordRequest } from "@modules/user/presentation/dto/v1/change-password.request";
import { ConfirmEmailQuery } from "@modules/user/presentation/dto/v1/confirm-email.query";
import { CreateUserRequest } from "@modules/user/presentation/dto/v1/create-user.request";
import { CreateUserResponse } from "@modules/user/presentation/dto/v1/create-user.response";
import { ProfileDto } from "@modules/user/presentation/dto/v1/profile.dto";
import { UpdateProfileRequest } from "@modules/user/presentation/dto/v1/update-profile.request";
import { UpdateUserRequest } from "@modules/user/presentation/dto/v1/update-user.request";
import { UserDto } from "@modules/user/presentation/dto/v1/user.dto";

const UNKNOWN_VALUE = "unknown";

@Controller({ path: "users", version: "1" })
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService,
    private readonly deviceInfoParser: DeviceInfoParser,
    private readonly profileAccess: ProfileAccessPolicy
  ) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @SessionAccessToken()
  @OAuthAccessToken(OAuthScope.UserRead)
  @Get("me")
  async me(@CurrentAuth() auth: AuthContext): Promise<UserDto | ProfileDto> {
    const user = await this.queryBus.execute<GetUserQuery, User>(new GetUserQuery(auth.userId, true));

    return auth.type === AccessTokenType.Session ? UserDto.fromDomain(user) : ProfileDto.fromUser(user);
  }

  @SessionAccessToken()
  @OAuthAccessToken(OAuthScope.UserWrite)
  @Patch("me")
  async updateMe(
    @CurrentAuth() auth: AuthContext,
    @Body() request: UpdateProfileRequest,
    @Req() httpRequest: Request
  ): Promise<UserDto | ProfileDto> {
    this.profileAccess.assertCanUpdate(auth, httpRequest.body);

    const command = new UpdateUserCommand(auth.userId, request.name, request.surname, request.email);
    const user = await this.commandBus.execute<UpdateUserCommand, User>(command);

    return auth.type === AccessTokenType.Session ? UserDto.fromDomain(user) : ProfileDto.fromUser(user);
  }

  @Patch("me/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    request: ChangePasswordRequest
  ): Promise<void> {
    const command = new ChangePasswordCommand(currentUser.userId, request.oldPassword, request.newPassword);
    await this.commandBus.execute<ChangePasswordCommand, void>(command);
  }

  @Public()
  @Get("confirm-email")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async confirmEmail(
    @Query()
    query: ConfirmEmailQuery
  ): Promise<UserDto> {
    const user = await this.commandBus.execute<ConfirmEmailCommand, User>(new ConfirmEmailCommand(query.token));

    return UserDto.fromDomain(user);
  }

  @Get(":id")
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
  async delete(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<void> {
    await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand(id));
  }

  @Roles(RoleType.Admin)
  @Patch(":id/block")
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
  async unblock(
    @Param("id", ParseUUIDPipe)
    id: string
  ): Promise<UserDto> {
    const user = await this.commandBus.execute<UnblockUserCommand, User>(new UnblockUserCommand(id));

    return UserDto.fromDomain(user);
  }
}
