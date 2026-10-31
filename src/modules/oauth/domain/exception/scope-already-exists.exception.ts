import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeAlreadyExistsException extends DomainException {
  constructor(message = "Scope already exists") {
    super(
      message,
      "SCOPE_ALREADY_EXISTS",
      HttpStatus.Conflict
    );
  }
}
