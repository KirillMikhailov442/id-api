import { Inject, Injectable } from "@nestjs/common";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { AuthorizationScopesNotAllowedException } from "@modules/oauth/domain/exception/authorization-scopes-not-allowed.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { RedirectUriNotAllowedException } from "@modules/oauth/domain/exception/redirect-uri-not-allowed.exception";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

@Injectable()
export class AuthorizationRequestValidator {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepository: IClientRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY)
    private readonly clientScopeRepository: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY)
    private readonly scopeRepository: IScopeRepository
  ) {}

  async validateRedirect(clientId: ClientId, redirectUri: string): Promise<Client> {
    const client = await this.clientRepository.findById(clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    const redirectUriValue = new RedirectUri(redirectUri).getValue();

    if (client.getLocation()?.getValue() !== redirectUriValue) {
      throw new RedirectUriNotAllowedException();
    }

    return client;
  }

  async validate(clientId: ClientId, redirectUri: string, scopes: string[]): Promise<Client> {
    const client = await this.validateRedirect(clientId, redirectUri);

    if (!client.getIsActive()) {
      throw new ClientInactiveException();
    }

    const requestedScopes = new CodeScopes(scopes);
    const assignments = await this.clientScopeRepository.findByClientId(client.getId());
    const assignedScopeIds = assignments.map((assignment) => assignment.getScopeId());
    const assignedScopes = await this.scopeRepository.findByIds(assignedScopeIds);
    const allowedScopeNames = new Set(assignedScopes.map((scope) => scope.getName().getValue()));

    if (!requestedScopes.getItems().every((scope) => allowedScopeNames.has(scope))) {
      throw new AuthorizationScopesNotAllowedException();
    }

    return client;
  }
}
