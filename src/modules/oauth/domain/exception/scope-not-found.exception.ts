import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ScopeNotFoundException extends DomainException {
  readonly code = "SCOPE_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Scope not found") {
    super(message);
    this.name = "ScopeNotFoundException";
  }
}
