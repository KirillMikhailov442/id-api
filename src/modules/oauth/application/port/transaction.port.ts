import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";

export interface IClientsTransactionContext {
  readonly clientRepository: IClientRepository;
  readonly locationRepository: ILocationRepository;
  readonly clientScopeRepository: IClientScopeRepository;
  readonly scopeRepository: IScopeRepository;
}

export interface IClientsTransaction {
  run<T>(work: (context: IClientsTransactionContext) => Promise<T>): Promise<T>;
}
