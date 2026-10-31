import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientAlreadyActiveException extends DomainException {
  constructor(
    message = "Client is already active"
  ) {
    super(
      message,
      "CLIENT_ALREADY_ACTIVE",
      HttpStatus.Conflict
    );
  }
}
