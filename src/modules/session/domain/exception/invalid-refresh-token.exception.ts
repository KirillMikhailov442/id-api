import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidRefreshTokenException extends DomainException {
  readonly code = "INVALID_REFRESH_TOKEN";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Invalid refresh token") {
    super(message);
    this.name = "InvalidRefreshTokenException";
  }
}
