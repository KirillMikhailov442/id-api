import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

@Injectable()
export class ProfileAccessPolicy {
  assertCanUpdate(auth: AuthContext, input: unknown): void {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestException("Profile update must be an object");
    }

    const fields = Object.keys(input);

    if (fields.length === 0) throw new BadRequestException("Provide at least one profile field");

    const allowed = auth.type === AccessTokenType.OAuth ? ["name", "surname"] : ["name", "surname", "email"];

    if (!fields.every((field) => allowed.includes(field))) {
      if (auth.type === AccessTokenType.OAuth)
        throw new ForbiddenException("OAuth applications can update only name and surname");

      throw new BadRequestException("Unsupported profile field");
    }
  }
}
