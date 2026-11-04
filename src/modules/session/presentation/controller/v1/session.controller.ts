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
import { PaginationMeta } from "@shared/pagination/pagination-meta";
import { PaginationQuery } from "@shared/pagination/pagination.query";
import { PaginationResponse } from "@shared/pagination/pagination.response";
import { SearchQuery } from "@shared/query/search.query";
import type { Response } from "express";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import type { SessionPage } from "@modules/session/application/port/session-repository";
import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import { SessionDto } from "@modules/session/presentation/dto/v1/session.dto";
import { SessionId } from "@modules/session/session.ids";

@Controller({ path: "users/me/sessions", version: "1" })
export class SessionController {
  constructor(
    @Inject(QueryBus)
    private readonly queryBus: QueryBus,
    @Inject(CommandBus)
    private readonly commandBus: CommandBus,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() pagination: PaginationQuery,
    @Query() search: SearchQuery
  ): Promise<PaginationResponse<SessionDto>> {
    const { items, total } = await this.queryBus.execute<ListActiveSessionsQuery, SessionPage>(
      new ListActiveSessionsQuery(currentUser.userId, pagination.limit, pagination.offset, search.search)
    );
    const sessions = items.map((session) => SessionDto.fromDomain(session, SessionId.from(currentUser.sessionId)));

    return new PaginationResponse(sessions, new PaginationMeta(total, pagination.limit, pagination.offset));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Param("id", ParseUUIDPipe)
    sessionId: string,
    @Res({ passthrough: true })
    httpResponse: Response
  ): Promise<void> {
    await this.commandBus.execute<RevokeSessionCommand, void>(new RevokeSessionCommand(currentUser.userId, sessionId));

    if (sessionId === currentUser.sessionId) {
      httpResponse.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(this.configService));
    }
  }
}
