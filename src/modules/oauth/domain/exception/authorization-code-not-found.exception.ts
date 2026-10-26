import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class AuthorizationCodeNotFoundException extends DomainException {
  readonly code = "invalid_grant";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Authorization code not found") {
    super(message);
    this.name = "AuthorizationCodeNotFoundException";
  }
}
