import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidAccessTokenException extends DomainException {
  readonly code = "INVALID_ACCESS_TOKEN";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Invalid access token") {
    super(message);
    this.name = "InvalidAccessTokenException";
  }
}
