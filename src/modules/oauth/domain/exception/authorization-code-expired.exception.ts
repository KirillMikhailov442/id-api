import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class AuthorizationCodeExpiredException extends DomainException {
  readonly code = "invalid_grant";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Authorization code is expired") {
    super(message);
    this.name = "AuthorizationCodeExpiredException";
  }
}
