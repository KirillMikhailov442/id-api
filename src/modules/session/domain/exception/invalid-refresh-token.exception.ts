import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidRefreshTokenException extends DomainException {
  readonly code = "INVALID_REFRESH_TOKEN";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Invalid refresh token") {
    super(message);
    this.name = "InvalidRefreshTokenException";
  }
}
