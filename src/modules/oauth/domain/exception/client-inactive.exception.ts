import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class ClientInactiveException extends DomainException {
  readonly code = "unauthorized_client";
  readonly status = HttpStatus.Forbidden;

  constructor(message = "Client is inactive") {
    super(message);
    this.name = "ClientInactiveException";
  }
}
