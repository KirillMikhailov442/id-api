import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserNotFoundException extends DomainException {
  readonly code = "USER_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundException";
  }
}
