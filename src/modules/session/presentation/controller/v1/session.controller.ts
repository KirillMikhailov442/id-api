import { Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "@shared/presentation/auth/authenticated-user.type";
import { CurrentUser } from "@shared/presentation/auth/current-user.decorator";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/presentation/auth/refresh-cookie.options";
import type { Response } from "express";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import type { Session } from "@modules/session/domain/entity/session";
import { SessionDto } from "@modules/session/presentation/dto/v1/session.dto";
import {
  ApiAuthenticatedResponse,
  ApiInvalidSessionIdResponse,
  ApiSessionNotFoundResponse,
} from "@modules/session/presentation/exception-response.decorator";

@ApiTags("sessions")
@Controller({ path: "users/me/sessions", version: "1" })
export class SessionController {
  private readonly queryBus: QueryBus;
  private readonly commandBus: CommandBus;
  private readonly configService: ConfigService;

  constructor(
    @Inject(QueryBus)
    queryBus: QueryBus,
    @Inject(CommandBus)
    commandBus: CommandBus,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    this.queryBus = queryBus;
    this.commandBus = commandBus;
    this.configService = configService;
  }

  @Get()
  @ApiAuthenticatedResponse()
  @ApiOperation({ summary: "List current user's active sessions" })
  @ApiOkResponse({
    type: SessionDto,
    isArray: true,
    description: "Non-revoked, unexpired sessions ordered by last use, newest first",
  })
  async list(
    @CurrentUser()
    currentUser: AuthenticatedUser
  ): Promise<SessionDto[]> {
    const sessions = await this.queryBus.execute<ListActiveSessionsQuery, Session[]>(
      new ListActiveSessionsQuery(currentUser.userId)
    );

    return sessions.map((session) => SessionDto.fromDomain(session, currentUser.sessionId));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticatedResponse()
  @ApiOperation({ summary: "Revoke one of the current user's sessions" })
  @ApiParam({ name: "id", format: "uuid", description: "Session ID from refresh_tokens" })
  @ApiNoContentResponse({ description: "Session revoked; repeated requests for an owned session also succeed" })
  @ApiInvalidSessionIdResponse()
  @ApiSessionNotFoundResponse()
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
