import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidClientCredentialsException extends DomainException {
  readonly code = "invalid_client";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Client credentials are invalid") {
    super(message);
    this.name = "InvalidClientCredentialsException";
  }
}
