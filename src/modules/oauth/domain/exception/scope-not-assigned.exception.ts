import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ScopeNotAssignedException extends DomainException {
  readonly code = "SCOPE_NOT_ASSIGNED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Scope is not assigned to the client") {
    super(message);
    this.name = "ScopeNotAssignedException";
  }
}
