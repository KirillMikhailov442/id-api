import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeAlreadyAssignedException extends DomainException {
  readonly code = "SCOPE_ALREADY_ASSIGNED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Scope is already assigned to the client") {
    super(message);
    this.name = "ScopeAlreadyAssignedException";
  }
}
