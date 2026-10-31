import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { ValidateAuthorizationQuery } from "@modules/oauth/application/query/validate-authorization.query";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";
import { ClientId } from "@modules/oauth/oauth.ids";

@QueryHandler(ValidateAuthorizationQuery)
@Injectable()
export class ValidateAuthorizationQueryHandler implements IQueryHandler<ValidateAuthorizationQuery> {
  constructor(
    @Inject(AuthorizationRequestValidator)
    private readonly authorizationRequestValidator: AuthorizationRequestValidator
  ) {}

  async execute(query: ValidateAuthorizationQuery): Promise<void> {
    const clientId = ClientId.from(query.clientId);

    await this.authorizationRequestValidator.validate(clientId, query.redirectUri, query.scopes);
  }
}
