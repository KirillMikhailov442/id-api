import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import type { OAuthGrant } from "@modules/oauth/domain/entity/oauth-grant";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { USER_REPOSITORY, UserBlockedStatus, type IUserRepository } from "@modules/user/user.module";

@Injectable()
export class OAuthPermissionsService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: IClientRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY) private readonly clientScopes: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY) private readonly scopes: IScopeRepository
  ) {}

  async assertCurrentPermissions(grant: Pick<OAuthGrant, "userId" | "clientId" | "scopes">): Promise<void> {
    const user = await this.users.findById(grant.userId);
    const client = await this.clients.findById(grant.clientId);

    if (
      user === null ||
      user.getIsBlocked() === UserBlockedStatus.Inactive ||
      client === null ||
      !client.getIsActive()
    ) {
      throw new UnauthorizedException("OAuth access is no longer active");
    }

    const assignments = await this.clientScopes.findByClientId(grant.clientId);
    const allowed = await this.scopes.findByIds(assignments.map((item) => item.getScopeId()));
    const names = new Set(allowed.map((item) => item.getName().getValue()));

    if (!grant.scopes.every((scope) => names.has(scope)))
      throw new ForbiddenException("OAuth client scopes were withdrawn");
  }
}
