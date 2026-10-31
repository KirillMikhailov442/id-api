import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientAccessDeniedException extends DomainException {
  readonly code = "access_denied";
  readonly status = HttpStatus.Forbidden;

  constructor(message = "Access to the client is denied") {
    super(message);
    this.name = "ClientAccessDeniedException";
  }
}
