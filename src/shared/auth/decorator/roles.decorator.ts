import { SetMetadata } from "@nestjs/common";

const ROLES_KEY = "roles";

export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);

export { ROLES_KEY };
