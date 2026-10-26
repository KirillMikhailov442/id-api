import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidAccessTokenException extends DomainException {
  readonly code = "INVALID_ACCESS_TOKEN";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Invalid access token") {
    super(message);
    this.name = "InvalidAccessTokenException";
  }
}
