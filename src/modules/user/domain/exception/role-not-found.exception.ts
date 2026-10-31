import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RoleNotFoundException extends DomainException {
  constructor(message = "Role not found") {
    super(
      message,
      "ROLE_NOT_FOUND",
      HttpStatus.NotFound
    );
  }
}
