import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientNotFoundException extends DomainException {
  constructor(message = "Client not found") {
    super(
      message,
      "CLIENT_NOT_FOUND",
      HttpStatus.NotFound
    );
  }
}
