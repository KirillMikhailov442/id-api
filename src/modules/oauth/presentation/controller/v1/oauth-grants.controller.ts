import { Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { CurrentUser } from "@shared/auth/decorator/current-user.decorator";
import { Roles } from "@shared/auth/decorator/roles.decorator";
import { PaginationMeta } from "@shared/pagination/pagination-meta";
import { PaginationQuery } from "@shared/pagination/pagination.query";
import { PaginationResponse } from "@shared/pagination/pagination.response";

import type { OAuthGrantPage } from "@modules/oauth/application/port/oauth-grant-store";
import { ListOAuthGrantsQuery } from "@modules/oauth/application/query/list-oauth-grants.query";
import { OAuthGrantRevocationService } from "@modules/oauth/application/service/oauth-grant-revocation.service";
import { OAuthGrantId } from "@modules/oauth/oauth.ids";
import { OAuthGrantDto } from "@modules/oauth/presentation/dto/v1/oauth-grant.dto";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserId } from "@modules/user/user.ids";

@Controller({ version: "1" })
export class OAuthGrantsController {
  constructor(
    @Inject(QueryBus) private readonly queries: QueryBus,
    @Inject(OAuthGrantRevocationService) private readonly revocations: OAuthGrantRevocationService
  ) {}

  @Get("oauth/grants/me")
  listOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationQuery
  ): Promise<PaginationResponse<OAuthGrantDto>> {
    return this.list(user.userId, pagination);
  }

  @Roles(RoleType.Admin)
  @Get("oauth/grants/:userId")
  listUser(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query() pagination: PaginationQuery
  ): Promise<PaginationResponse<OAuthGrantDto>> {
    return this.list(userId, pagination);
  }

  @Delete("oauth/grants/:id/me")
  @HttpCode(204)
  async revokeOwn(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.revocations.revoke(UserId.from(user.userId), OAuthGrantId.from(id));
  }

  @Roles(RoleType.Admin)
  @Delete("oauth/grants/:id")
  @HttpCode(204)
  async revokeUser(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.revocations.revokeAsAdmin(OAuthGrantId.from(id));
  }

  private async list(userId: string, pagination: PaginationQuery): Promise<PaginationResponse<OAuthGrantDto>> {
    const { items, total } = await this.queries.execute<ListOAuthGrantsQuery, OAuthGrantPage>(
      new ListOAuthGrantsQuery(userId, pagination.limit, pagination.offset)
    );
    const now = new Date();

    return new PaginationResponse(
      items.map((grant) => OAuthGrantDto.fromSummary(grant, now)),
      new PaginationMeta(total, pagination.limit, pagination.offset)
    );
  }
}
