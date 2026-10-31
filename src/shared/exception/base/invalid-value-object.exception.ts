import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidValueObjectException extends DomainException {
  constructor(message: string) {
    super(
      message,
      "INVALID_VALUE",
      HttpStatus.Validation
    );
  }
}
