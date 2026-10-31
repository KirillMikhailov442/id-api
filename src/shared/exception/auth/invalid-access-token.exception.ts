import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidAccessTokenException extends DomainException {
  constructor(message = "Invalid access token") {
    super(message, "INVALID_ACCESS_TOKEN", HttpStatus.Unauthorized);
  }
}
