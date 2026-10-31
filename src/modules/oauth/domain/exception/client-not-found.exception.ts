import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientNotFoundException extends DomainException {
  readonly code = "CLIENT_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Client not found") {
    super(message);
    this.name = "ClientNotFoundException";
  }
}
