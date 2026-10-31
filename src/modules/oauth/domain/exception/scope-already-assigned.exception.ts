import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeAlreadyAssignedException extends DomainException {
  constructor(
    message = "Scope is already assigned to the client"
  ) {
    super(
      message,
      "SCOPE_ALREADY_ASSIGNED",
      HttpStatus.Conflict
    );
  }
}
