import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ClientAlreadyActiveException extends DomainException {
  readonly code = "CLIENT_ALREADY_ACTIVE";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Client is already active") {
    super(message);
    this.name = "ClientAlreadyActiveException";
  }
}
