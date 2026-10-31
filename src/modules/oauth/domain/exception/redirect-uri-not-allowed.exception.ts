import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RedirectUriNotAllowedException extends DomainException {
  readonly code = "invalid_request";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Redirect uri is not registered for the client") {
    super(message);
    this.name = "RedirectUriNotAllowedException";
  }
}
