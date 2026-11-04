import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/auth/cookie/refresh-cookie.options";
import { CurrentUser } from "@shared/auth/decorator/current-user.decorator";
import { Roles } from "@shared/auth/decorator/roles.decorator";
import { PaginationMeta } from "@shared/pagination/pagination-meta";
import { PaginationQuery } from "@shared/pagination/pagination.query";
import { PaginationResponse } from "@shared/pagination/pagination.response";
import { SearchQuery } from "@shared/query/search.query";
import type { Response } from "express";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import { RevokeUserSessionsCommand } from "@modules/session/application/command/revoke-user-sessions.command";
import type { SessionPage } from "@modules/session/application/port/session-repository";
import { GetUserSessionQuery } from "@modules/session/application/query/get-user-session.query";
import { ListUserSessionsQuery } from "@modules/session/application/query/list-user-sessions.query";
import type { Session } from "@modules/session/domain/entity/session";
import { AdminSessionDto } from "@modules/session/presentation/dto/v1/admin-session.dto";
import { SessionId } from "@modules/session/session.ids";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";

@Roles(RoleType.Admin, RoleType.SuperUser)
@Controller({ path: "users/:userId/sessions", version: "1" })
export class AdminSessionController {
  constructor(
    @Inject(QueryBus) private readonly queryBus: QueryBus,
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  @Get()
  async list(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() pagination: PaginationQuery,
    @Query() search: SearchQuery
  ): Promise<PaginationResponse<AdminSessionDto>> {
    await this.queryBus.execute(new GetUserQuery(userId, currentUser.roles));

    const { items, total } = await this.queryBus.execute<ListUserSessionsQuery, SessionPage>(
      new ListUserSessionsQuery(userId, pagination.limit, pagination.offset, search.search)
    );
    const sessions = items.map((session) => AdminSessionDto.fromDomain(session, SessionId.from(currentUser.sessionId)));

    return new PaginationResponse(sessions, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Get(":sessionId")
  async get(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<AdminSessionDto> {
    await this.queryBus.execute(new GetUserQuery(userId, currentUser.roles));

    const session = await this.queryBus.execute<GetUserSessionQuery, Session>(
      new GetUserSessionQuery(userId, sessionId)
    );

    return AdminSessionDto.fromDomain(session, SessionId.from(currentUser.sessionId));
  }

  @Delete(":sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) httpResponse: Response
  ): Promise<void> {
    await this.queryBus.execute(new GetUserQuery(userId, currentUser.roles));
    await this.commandBus.execute<RevokeSessionCommand, void>(new RevokeSessionCommand(userId, sessionId));

    if (userId === currentUser.userId && sessionId === currentUser.sessionId) {
      httpResponse.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(this.configService));
    }
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAll(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) httpResponse: Response
  ): Promise<void> {
    await this.queryBus.execute(new GetUserQuery(userId, currentUser.roles));
    await this.commandBus.execute<RevokeUserSessionsCommand, void>(new RevokeUserSessionsCommand(userId));

    if (userId === currentUser.userId) {
      httpResponse.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(this.configService));
    }
  }
}
