import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidClientCredentialsException extends DomainException {
  constructor(
    message = "Client credentials are invalid"
  ) {
    super(
      message,
      "INVALID_CLIENT_CREDENTIALS",
      HttpStatus.Unauthorized
    );
  }
}
