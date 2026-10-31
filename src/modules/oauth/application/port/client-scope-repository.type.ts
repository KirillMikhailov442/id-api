import type { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import type { ClientId, ScopeId } from "@modules/oauth/oauth.ids";

export interface IClientScopeRepository {
  findByClientId(clientId: ClientId): Promise<ClientScope[]>;
  exists(clientId: ClientId, scopeId: ScopeId): Promise<boolean>;
  save(clientScope: ClientScope): Promise<void>;
  delete(clientId: ClientId, scopeId: ScopeId): Promise<void>;
  deleteByClientId(clientId: ClientId): Promise<void>;
}
