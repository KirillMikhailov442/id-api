import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidCredentialsException extends DomainException {
  readonly code = "INVALID_CREDENTIALS";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Invalid credentials") {
    super(message);
    this.name = "InvalidCredentialsException";
  }
}
