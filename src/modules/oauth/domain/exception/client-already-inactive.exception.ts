import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ClientAlreadyInactiveException extends DomainException {
  readonly code = "CLIENT_ALREADY_INACTIVE";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Client is already inactive") {
    super(message);
    this.name = "ClientAlreadyInactiveException";
  }
}
