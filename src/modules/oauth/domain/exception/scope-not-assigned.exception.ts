import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeNotAssignedException extends DomainException {
  readonly code = "SCOPE_NOT_ASSIGNED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Scope is not assigned to the client") {
    super(message);
    this.name = "ScopeNotAssignedException";
  }
}
