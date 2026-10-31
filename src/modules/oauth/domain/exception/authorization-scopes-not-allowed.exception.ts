import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AuthorizationScopesNotAllowedException extends DomainException {
  constructor(
    message = "Requested scopes are not assigned to the client"
  ) {
    super(
      message,
      "AUTHORIZATION_SCOPES_NOT_ALLOWED",
      HttpStatus.Validation,
      "scopes"
    );
  }
}
