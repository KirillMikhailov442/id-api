import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class UserAlreadyUnblockedException extends DomainException {
  readonly code = "USER_ALREADY_UNBLOCKED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "User is already unblocked") {
    super(message);
    this.name = "UserAlreadyUnblockedException";
  }
}
