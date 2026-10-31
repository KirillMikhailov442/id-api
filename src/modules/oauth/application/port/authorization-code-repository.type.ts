import type { IRepository } from "@shared/repository/repository.type";

import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import type { AuthorizationCodeId } from "@modules/oauth/oauth.ids";

export interface IAuthorizationCodeRepository extends IRepository<AuthorizationCode, AuthorizationCodeId> {
  findByCodeHash(codeHash: string): Promise<AuthorizationCode | null>;
}
