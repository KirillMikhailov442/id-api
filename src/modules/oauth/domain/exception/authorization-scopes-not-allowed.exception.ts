import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class AuthorizationScopesNotAllowedException extends DomainException {
  readonly code = "invalid_scope";
  readonly status = HttpStatus.Validation;
  override readonly field = "scopes";

  constructor(message = "Requested scopes are not assigned to the client") {
    super(message);
    this.name = "AuthorizationScopesNotAllowedException";
  }
}
