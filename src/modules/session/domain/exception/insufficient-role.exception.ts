import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InsufficientRoleException extends DomainException {
  constructor(message = "Insufficient role") {
    super(
      message,
      "INSUFFICIENT_ROLE",
      HttpStatus.Forbidden
    );
  }
}
