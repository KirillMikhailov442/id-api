import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidValueObjectException extends DomainException {
  readonly code = "INVALID_VALUE";
  readonly status = HttpStatus.Validation;

  constructor(message: string) {
    super(message);
    this.name = "InvalidValueObjectException";
  }
}
