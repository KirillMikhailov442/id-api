import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AuthorizationCodeAlreadyUsedException extends DomainException {
  constructor(
    message = "Authorization code has already been used"
  ) {
    super(
      message,
      "AUTHORIZATION_CODE_ALREADY_USED",
      HttpStatus.Conflict
    );
  }
}
