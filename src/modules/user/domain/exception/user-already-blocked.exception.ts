import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class UserAlreadyBlockedException extends DomainException {
  readonly code = "USER_ALREADY_BLOCKED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "User is already blocked") {
    super(message);
    this.name = "UserAlreadyBlockedException";
  }
}
