import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AccessTokenExpiredException extends DomainException {
  constructor(message = "Access token expired") {
    super(
      message,
      "ACCESS_TOKEN_EXPIRED",
      HttpStatus.Unauthorized
    );
  }
}
