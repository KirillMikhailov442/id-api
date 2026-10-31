import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidRefreshTokenException extends DomainException {
  constructor(message = "Invalid refresh token") {
    super(
      message,
      "INVALID_REFRESH_TOKEN",
      HttpStatus.Unauthorized
    );
  }
}
