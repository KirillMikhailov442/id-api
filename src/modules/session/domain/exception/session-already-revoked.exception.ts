import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class SessionAlreadyRevokedException extends DomainException {
  constructor(
    message = "Session is already revoked"
  ) {
    super(
      message,
      "SESSION_ALREADY_REVOKED",
      HttpStatus.Conflict
    );
  }
}
