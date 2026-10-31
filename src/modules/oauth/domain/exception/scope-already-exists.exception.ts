import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeAlreadyExistsException extends DomainException {
  readonly code = "SCOPE_ALREADY_EXISTS";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Scope already exists") {
    super(message);
    this.name = "ScopeAlreadyExistsException";
  }
}
