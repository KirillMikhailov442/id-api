import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { ValidateClientRedirectQuery } from "@modules/oauth/application/query/validate-client-redirect.query";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";
import { ClientId } from "@modules/oauth/oauth.ids";

@QueryHandler(ValidateClientRedirectQuery)
@Injectable()
export class ValidateClientRedirectQueryHandler implements IQueryHandler<ValidateClientRedirectQuery> {
  constructor(
    @Inject(AuthorizationRequestValidator)
    private readonly authorizationRequestValidator: AuthorizationRequestValidator
  ) {}

  async execute(query: ValidateClientRedirectQuery): Promise<void> {
    const clientId = ClientId.from(query.clientId);

    await this.authorizationRequestValidator.validateRedirect(clientId, query.redirectUri);
  }
}
