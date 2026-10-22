import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { AuthorizationRequestValidator } from "@modules/oauth/application/authorization-request-validator";
import { ValidateAuthorizationQuery } from "@modules/oauth/application/query/validate-authorization.query";

@QueryHandler(ValidateAuthorizationQuery)
@Injectable()
export class ValidateAuthorizationQueryHandler implements IQueryHandler<ValidateAuthorizationQuery> {
  constructor(
    @Inject(AuthorizationRequestValidator) private readonly authorizationRequestValidator: AuthorizationRequestValidator
  ) {}

  async execute(query: ValidateAuthorizationQuery): Promise<void> {
    await this.authorizationRequestValidator.validate(query.clientId, query.redirectUri, query.scopes);
  }
}
