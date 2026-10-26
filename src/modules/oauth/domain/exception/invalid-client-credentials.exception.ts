import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidClientCredentialsException extends DomainException {
  readonly code = "invalid_client";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Client credentials are invalid") {
    super(message);
    this.name = "InvalidClientCredentialsException";
  }
}
