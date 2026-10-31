import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientAlreadyActiveException extends DomainException {
  readonly code = "CLIENT_ALREADY_ACTIVE";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Client is already active") {
    super(message);
    this.name = "ClientAlreadyActiveException";
  }
}
