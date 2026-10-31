import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class SessionNotFoundException extends DomainException {
  constructor(message = "Session not found") {
    super(
      message,
      "SESSION_NOT_FOUND",
      HttpStatus.NotFound
    );
  }
}
