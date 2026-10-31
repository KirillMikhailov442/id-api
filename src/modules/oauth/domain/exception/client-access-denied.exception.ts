import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ClientAccessDeniedException extends DomainException {
  constructor(
    message = "Access to the client is denied"
  ) {
    super(
      message,
      "CLIENT_ACCESS_DENIED",
      HttpStatus.Forbidden
    );
  }
}
