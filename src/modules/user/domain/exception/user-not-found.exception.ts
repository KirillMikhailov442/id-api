import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserNotFoundException extends DomainException {
  constructor(message = "User not found") {
    super(
      message,
      "USER_NOT_FOUND",
      HttpStatus.NotFound
    );
  }
}
