import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AuthorizationCodeExpiredException extends DomainException {
  constructor(
    message = "Authorization code is expired"
  ) {
    super(
      message,
      "AUTHORIZATION_CODE_EXPIRED",
      HttpStatus.BadRequest
    );
  }
}
