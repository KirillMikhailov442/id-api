import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidOldPasswordException extends DomainException {
  readonly code = "INVALID_OLD_PASSWORD";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Old password is incorrect") {
    super(message);
    this.name = "InvalidOldPasswordException";
  }
}
