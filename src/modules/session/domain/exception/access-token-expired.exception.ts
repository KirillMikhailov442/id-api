import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class AccessTokenExpiredException extends DomainException {
  readonly code = "ACCESS_TOKEN_EXPIRED";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Access token expired") {
    super(message);
    this.name = "AccessTokenExpiredException";
  }
}
