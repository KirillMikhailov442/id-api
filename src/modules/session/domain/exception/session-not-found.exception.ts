import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class SessionNotFoundException extends DomainException {
  readonly code = "SESSION_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Session not found") {
    super(message);
    this.name = "SessionNotFoundException";
  }
}
