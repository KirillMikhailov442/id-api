import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserAlreadyBlockedException extends DomainException {
  readonly code = "USER_ALREADY_BLOCKED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "User is already blocked") {
    super(message);
    this.name = "UserAlreadyBlockedException";
  }
}
