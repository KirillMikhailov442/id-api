import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserAlreadyBlockedException extends DomainException {
  constructor(
    message = "User is already blocked"
  ) {
    super(
      message,
      "USER_ALREADY_BLOCKED",
      HttpStatus.Conflict
    );
  }
}
