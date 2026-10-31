import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IdTokenPublicKey } from "@modules/oauth/application/port/id-token-public-key.type";
import type { IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";
import { GetJwksQuery } from "@modules/oauth/application/query/get-jwks.query";
import { ID_TOKEN_SERVICE } from "@modules/oauth/oauth.tokens";

@QueryHandler(GetJwksQuery)
@Injectable()
export class GetJwksQueryHandler implements IQueryHandler<GetJwksQuery> {
  constructor(
    @Inject(ID_TOKEN_SERVICE)
    private readonly idTokenService: IIdTokenService
  ) {}

  execute(_query: GetJwksQuery): Promise<IdTokenPublicKey[]> {
    return Promise.resolve(this.idTokenService.getPublicKeys());
  }
}
