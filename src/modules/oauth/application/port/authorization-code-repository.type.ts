import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";

import type { IRepository } from "@core/shared/domain/repository.type";

export interface IAuthorizationCodeRepository extends IRepository<AuthorizationCode, string> {
  findByCodeHash(codeHash: string): Promise<AuthorizationCode | null>;
}
