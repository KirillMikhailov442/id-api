import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AuthorizationCodeNotFoundException extends DomainException {
  readonly code = "invalid_grant";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Authorization code not found") {
    super(message);
    this.name = "AuthorizationCodeNotFoundException";
  }
}
