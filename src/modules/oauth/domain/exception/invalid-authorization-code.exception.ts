import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidAuthorizationCodeException extends DomainException {
  readonly code = "invalid_grant";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Authorization code is invalid") {
    super(message);
    this.name = "InvalidAuthorizationCodeException";
  }
}
