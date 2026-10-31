import { InjectRepository } from "@nestjs/typeorm";
import type { PaginationQuery } from "@shared/pagination/pagination.query";
import { In, QueryFailedError, type Repository } from "typeorm";

import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { ScopeAlreadyExistsException } from "@modules/oauth/domain/exception/scope-already-exists.exception";
import type { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { ScopeMapper } from "@modules/oauth/infrastructure/mapper/scope.mapper";
import { ScopeId } from "@modules/oauth/oauth.ids";

const SCOPE_NAME_UNIQUE_CONSTRAINT = "scopes_name_key";

export class DbScopeRepository implements IScopeRepository {
  constructor(
    @InjectRepository(DbScope)
    private readonly repository: Repository<DbScope>
  ) {}

  async findById(id: ScopeId): Promise<Scope | null> {
    const dbScope = await this.repository.findOneBy({ id: id.getValue() });

    if (dbScope === null) {
      return null;
    }

    return ScopeMapper.toDomain(dbScope);
  }

  async findByName(name: ScopeName): Promise<Scope | null> {
    const dbScope = await this.repository.findOneBy({ name: name.getValue() });

    if (dbScope === null) {
      return null;
    }

    return ScopeMapper.toDomain(dbScope);
  }

  async findByIds(ids: ScopeId[]): Promise<Scope[]> {
    if (ids.length === 0) {
      return [];
    }

    const dbScopes = await this.repository.find({ where: { id: In(ids.map((id) => id.getValue())) } });

    return dbScopes.map(ScopeMapper.toDomain);
  }

  async findAll(pagination: PaginationQuery): Promise<Scope[]> {
    const dbScopes = await this.repository.find({
      skip: pagination.offset,
      take: pagination.limit,
      order: { createdAt: "DESC" },
    });

    return dbScopes.map(ScopeMapper.toDomain);
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async save(scope: Scope): Promise<void> {
    try {
      await this.repository.save(ScopeMapper.toPersistence(scope));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async delete(id: ScopeId): Promise<void> {
    await this.repository.delete(id.getValue());
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

      if (constraint === SCOPE_NAME_UNIQUE_CONSTRAINT) {
        return new ScopeAlreadyExistsException();
      }
    }

    return error as Error;
  }
}
