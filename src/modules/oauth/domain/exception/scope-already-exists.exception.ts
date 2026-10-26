import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ScopeAlreadyExistsException extends DomainException {
  readonly code = "SCOPE_ALREADY_EXISTS";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Scope already exists") {
    super(message);
    this.name = "ScopeAlreadyExistsException";
  }
}
