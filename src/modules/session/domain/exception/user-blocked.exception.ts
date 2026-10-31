import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserBlockedException extends DomainException {
  constructor(message = "User is blocked") {
    super(
      message,
      "USER_BLOCKED",
      HttpStatus.Forbidden
    );
  }
}
