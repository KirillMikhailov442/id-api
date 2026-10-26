import { Inject, Injectable } from "@nestjs/common";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { AuthorizationScopesNotAllowedException } from "@modules/oauth/domain/exception/authorization-scopes-not-allowed.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { RedirectUriNotAllowedException } from "@modules/oauth/domain/exception/redirect-uri-not-allowed.exception";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import {
  CLIENT_REPOSITORY,
  CLIENT_SCOPE_REPOSITORY,
  LOCATION_REPOSITORY,
  SCOPE_REPOSITORY,
} from "@modules/oauth/oauth.tokens";

@Injectable()
export class AuthorizationRequestValidator {
  private readonly clientRepository: IClientRepository;
  private readonly locationRepository: ILocationRepository;
  private readonly clientScopeRepository: IClientScopeRepository;
  private readonly scopeRepository: IScopeRepository;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository,
    @Inject(LOCATION_REPOSITORY)
    locationRepository: ILocationRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY)
    clientScopeRepository: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY)
    scopeRepository: IScopeRepository
  ) {
    this.clientRepository = clientRepository;
    this.locationRepository = locationRepository;
    this.clientScopeRepository = clientScopeRepository;
    this.scopeRepository = scopeRepository;
  }

  async validate(clientId: string, redirectUri: string, scopes: string[]): Promise<Client> {
    const client = await this.clientRepository.findById(clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    if (!client.getIsActive()) {
      throw new ClientInactiveException();
    }

    const redirectUriValue = new RedirectUri(redirectUri).getValue();
    const locations = await this.locationRepository.findByClientId(client.getId());

    if (!locations.some((location) => location.getHref().getValue() === redirectUriValue)) {
      throw new RedirectUriNotAllowedException();
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
