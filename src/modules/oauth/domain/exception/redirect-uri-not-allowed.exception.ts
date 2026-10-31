import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RedirectUriNotAllowedException extends DomainException {
  constructor(
    message = "Redirect uri is not registered for the client"
  ) {
    super(
      message,
      "REDIRECT_URI_NOT_ALLOWED",
      HttpStatus.BadRequest
    );
  }
}
