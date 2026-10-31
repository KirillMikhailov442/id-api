import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ScopeNotFoundException extends DomainException {
  constructor(message = "Scope not found") {
    super(
      message,
      "SCOPE_NOT_FOUND",
      HttpStatus.NotFound
    );
  }
}
