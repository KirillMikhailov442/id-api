import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AuthorizationCodeAlreadyUsedException extends DomainException {
  readonly code = "invalid_grant";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Authorization code has already been used") {
    super(message);
    this.name = "AuthorizationCodeAlreadyUsedException";
  }
}
