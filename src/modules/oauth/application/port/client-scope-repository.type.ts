import type { ClientScope } from "@modules/oauth/domain/entity/client-scope";

export interface IClientScopeRepository {
  findByClientId(clientId: string): Promise<ClientScope[]>;
  exists(clientId: string, scopeId: string): Promise<boolean>;
  save(clientScope: ClientScope): Promise<void>;
  delete(clientId: string, scopeId: string): Promise<void>;
  deleteByClientId(clientId: string): Promise<void>;
}
