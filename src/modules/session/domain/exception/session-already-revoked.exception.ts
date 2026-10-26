import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class SessionAlreadyRevokedException extends DomainException {
  readonly code = "SESSION_ALREADY_REVOKED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Session is already revoked") {
    super(message);
    this.name = "SessionAlreadyRevokedException";
  }
}
