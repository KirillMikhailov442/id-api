import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class UserNotFoundException extends DomainException {
  readonly code = "USER_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundException";
  }
}
