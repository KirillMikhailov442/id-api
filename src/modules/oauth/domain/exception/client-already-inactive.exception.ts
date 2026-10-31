import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientAlreadyInactiveException extends DomainException {
  constructor(
    message = "Client is already inactive"
  ) {
    super(
      message,
      "CLIENT_ALREADY_INACTIVE",
      HttpStatus.Conflict
    );
  }
}
