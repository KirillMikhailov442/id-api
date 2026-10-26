import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class AccessTokenExpiredException extends DomainException {
  readonly code = "ACCESS_TOKEN_EXPIRED";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Access token expired") {
    super(message);
    this.name = "AccessTokenExpiredException";
  }
}
