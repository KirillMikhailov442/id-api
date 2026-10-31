import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { AuthorizationCodeMapper } from "@modules/oauth/infrastructure/mapper/authorization-code.mapper";
import { AuthorizationCodeId } from "@modules/oauth/oauth.ids";

export class DbAuthorizationCodeRepository implements IAuthorizationCodeRepository {
  constructor(
    @InjectRepository(DbAuthorizationCode)
    private readonly repository: Repository<DbAuthorizationCode>
  ) {}

  async findById(id: AuthorizationCodeId): Promise<AuthorizationCode | null> {
    const dbAuthorizationCode = await this.repository.findOneBy({ id: id.getValue() });

    if (dbAuthorizationCode === null) {
      return null;
    }

    return AuthorizationCodeMapper.toDomain(dbAuthorizationCode);
  }

  async findByCodeHash(codeHash: string): Promise<AuthorizationCode | null> {
    const dbAuthorizationCode = await this.repository.findOneBy({ codeHash });

    if (dbAuthorizationCode === null) {
      return null;
    }

    return AuthorizationCodeMapper.toDomain(dbAuthorizationCode);
  }

  async save(authorizationCode: AuthorizationCode): Promise<void> {
    await this.repository.save(AuthorizationCodeMapper.toPersistence(authorizationCode));
  }

  async delete(id: AuthorizationCodeId): Promise<void> {
    await this.repository.delete(id.getValue());
  }
}
