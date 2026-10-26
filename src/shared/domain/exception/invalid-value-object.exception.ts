import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidValueObjectException extends DomainException {
  readonly code = "INVALID_VALUE";
  readonly status = HttpStatus.Validation;

  constructor(message: string) {
    super(message);
    this.name = "InvalidValueObjectException";
  }
}
