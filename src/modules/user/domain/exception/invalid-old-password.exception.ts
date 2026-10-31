import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidOldPasswordException extends DomainException {
  constructor(
    message = "Old password is incorrect"
  ) {
    super(
      message,
      "INVALID_OLD_PASSWORD",
      HttpStatus.BadRequest
    );
  }
}
