import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientInactiveException extends DomainException {
  constructor(message = "Client is inactive") {
    super(
      message,
      "CLIENT_INACTIVE",
      HttpStatus.Forbidden
    );
  }
}
