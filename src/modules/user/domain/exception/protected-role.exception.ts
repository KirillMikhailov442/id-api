import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ProtectedRoleException extends DomainException {
  constructor() {
    super(
      "The SUPERUSER role cannot be modified or deleted",
      "PROTECTED_ROLE",
      HttpStatus.Forbidden
    );
  }
}
