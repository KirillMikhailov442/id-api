import type { IRepository } from "@shared/repository/repository.type";

import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";

export interface IAuthorizationCodeRepository extends IRepository<AuthorizationCode, string> {
  findByCodeHash(codeHash: string): Promise<AuthorizationCode | null>;
}
