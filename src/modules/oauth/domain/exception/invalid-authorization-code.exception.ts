import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidAuthorizationCodeException extends DomainException {
  constructor(
    message = "Authorization code is invalid"
  ) {
    super(
      message,
      "INVALID_AUTHORIZATION_CODE",
      HttpStatus.BadRequest
    );
  }
}
