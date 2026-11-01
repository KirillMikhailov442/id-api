import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class UserRoleChangeForbiddenException extends DomainException {
  constructor(
    message = "This user role change is not allowed"
  ) {
    super(
      message,
      "USER_ROLE_CHANGE_FORBIDDEN",
      HttpStatus.Forbidden
    );
  }
}
