import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeNotFoundException extends DomainException {
  readonly code = "SCOPE_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Scope not found") {
    super(message);
    this.name = "ScopeNotFoundException";
  }
}
