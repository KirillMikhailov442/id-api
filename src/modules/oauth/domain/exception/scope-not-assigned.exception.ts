import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeNotAssignedException extends DomainException {
  constructor(
    message = "Scope is not assigned to the client"
  ) {
    super(
      message,
      "SCOPE_NOT_ASSIGNED",
      HttpStatus.Conflict
    );
  }
}
