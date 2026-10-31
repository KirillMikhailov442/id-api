import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserAlreadyUnblockedException extends DomainException {
  constructor(
    message = "User is already unblocked"
  ) {
    super(
      message,
      "USER_ALREADY_UNBLOCKED",
      HttpStatus.Conflict
    );
  }
}
