import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ClientAccessDeniedException extends DomainException {
  readonly code = "access_denied";
  readonly status = HttpStatus.Forbidden;

  constructor(message = "Access to the client is denied") {
    super(message);
    this.name = "ClientAccessDeniedException";
  }
}
