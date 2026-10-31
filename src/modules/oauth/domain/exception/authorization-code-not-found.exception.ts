import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AuthorizationCodeNotFoundException extends DomainException {
  constructor(
    message = "Authorization code not found"
  ) {
    super(
      message,
      "AUTHORIZATION_CODE_NOT_FOUND",
      HttpStatus.NotFound
    );
  }
}
