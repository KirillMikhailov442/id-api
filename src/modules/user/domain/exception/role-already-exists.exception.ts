import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RoleAlreadyExistsException extends DomainException {
  constructor(message = "Role already exists") {
    super(
      message,
      "ROLE_ALREADY_EXISTS",
      HttpStatus.Conflict
    );
  }
}
