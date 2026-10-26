import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ClientNotFoundException extends DomainException {
  readonly code = "CLIENT_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Client not found") {
    super(message);
    this.name = "ClientNotFoundException";
  }
}
