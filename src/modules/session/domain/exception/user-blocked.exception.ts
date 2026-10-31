import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserBlockedException extends DomainException {
  readonly code = "USER_BLOCKED";
  readonly status = HttpStatus.Forbidden;

  constructor(message = "User is blocked") {
    super(message);
    this.name = "UserBlockedException";
  }
}
