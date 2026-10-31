import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, type Repository } from "typeorm";

import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { ScopeAlreadyAssignedException } from "@modules/oauth/domain/exception/scope-already-assigned.exception";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { ClientScopeMapper } from "@modules/oauth/infrastructure/mapper/client-scope.mapper";
import { ClientId, ScopeId } from "@modules/oauth/oauth.ids";

const CLIENT_SCOPES_UNIQUE_CONSTRAINT = "client_scopes_unique_0";

export class DbClientScopeRepository implements IClientScopeRepository {
  constructor(
    @InjectRepository(DbClientScope)
    private readonly repository: Repository<DbClientScope>
  ) {}

  async findByClientId(clientId: ClientId): Promise<ClientScope[]> {
    const dbClientScopes = await this.repository.find({
      where: { clientId: clientId.getValue() },
      order: { assignedAt: "DESC" },
    });

    return dbClientScopes.map(ClientScopeMapper.toDomain);
  }

  async exists(clientId: ClientId, scopeId: ScopeId): Promise<boolean> {
    const count = await this.repository.count({
      where: { clientId: clientId.getValue(), scopeId: scopeId.getValue() },
    });

    return count > 0;
  }

  async save(clientScope: ClientScope): Promise<void> {
    try {
      await this.repository.save(ClientScopeMapper.toPersistence(clientScope));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async delete(clientId: ClientId, scopeId: ScopeId): Promise<void> {
    await this.repository.delete({ clientId: clientId.getValue(), scopeId: scopeId.getValue() });
  }

  async deleteByClientId(clientId: ClientId): Promise<void> {
    await this.repository.delete({ clientId: clientId.getValue() });
  }

  private mapError(error: unknown): Error {
    if (
      error instanceof QueryFailedError &&
      (
        error as QueryFailedError & {
          code?: string;
        }
      ).code === "23505"
    ) {
      const constraint = (
        error as QueryFailedError & {
          constraint?: string;
        }
      ).constraint;

      if (constraint === CLIENT_SCOPES_UNIQUE_CONSTRAINT) {
        return new ScopeAlreadyAssignedException();
      }
    }

    return error as Error;
  }
}
