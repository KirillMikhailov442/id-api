import { Controller, Get, Inject } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "@shared/presentation/auth/authenticated-user.type";
import { CurrentUser } from "@shared/presentation/auth/current-user.decorator";

import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import type { Session } from "@modules/session/domain/entity/session";
import { SessionDto } from "@modules/session/presentation/dto/v1/session.dto";
import { ApiAuthenticatedResponse } from "@modules/session/presentation/exception-response.decorator";

@ApiTags("sessions")
@Controller({ path: "users/me/sessions", version: "1" })
export class SessionController {
  private readonly queryBus: QueryBus;

  constructor(
    @Inject(QueryBus)
    queryBus: QueryBus
  ) {
    this.queryBus = queryBus;
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
}
