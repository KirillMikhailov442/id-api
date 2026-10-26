import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidAuthorizationCodeException extends DomainException {
  readonly code = "invalid_grant";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Authorization code is invalid") {
    super(message);
    this.name = "InvalidAuthorizationCodeException";
  }
}
