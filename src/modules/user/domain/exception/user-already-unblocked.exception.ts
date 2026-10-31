import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserAlreadyUnblockedException extends DomainException {
  readonly code = "USER_ALREADY_UNBLOCKED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "User is already unblocked") {
    super(message);
    this.name = "UserAlreadyUnblockedException";
  }
}
