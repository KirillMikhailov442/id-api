import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import {
  ApiAccessTokenExpiredResponse,
  ApiInsufficientRoleResponse,
  ApiInvalidAccessTokenResponse,
} from "@modules/session/presentation/exception-response.decorator";
import { RoleController } from "@modules/user/presentation/controller/v1/role.controller";
import { RoleDto } from "@modules/user/presentation/dto/v1/role.dto";
import {
  ApiInvalidRoleIdResponse,
  ApiProtectedRoleResponse,
  ApiRoleAlreadyExistsResponse,
  ApiRoleCreateValidationFailedResponse,
  ApiRoleNotFoundResponse,
  ApiRoleUpdateValidationFailedResponse,
  ApiUnexpectedErrorResponse,
} from "@modules/user/presentation/exception-response.decorator";

type RoleControllerMethod = {
  [K in keyof RoleController]: RoleController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof RoleController];

function documentMethod(name: RoleControllerMethod, ...decorators: MethodDecorator[]): void {
  const descriptor = Object.getOwnPropertyDescriptor(RoleController.prototype, name);

  if (descriptor === undefined) {
    throw new Error(`RoleController.${name} does not exist`);
  }

  for (const decorator of [...decorators].reverse()) {
    decorator(RoleController.prototype, name, descriptor);
  }
}

export function registerRoleControllerSwagger(): void {
  ApiInsufficientRoleResponse()(RoleController);
  ApiAccessTokenExpiredResponse()(RoleController);
  ApiInvalidAccessTokenResponse()(RoleController);
  ApiBearerAuth()(RoleController);
  ApiTags("roles")(RoleController);

  documentMethod(
    "create",
    ApiOperation({ description: "Requires admin role" }),
    ApiCreatedResponse({ type: RoleDto, description: "Role created" }),
    ApiRoleAlreadyExistsResponse(),
    ApiRoleCreateValidationFailedResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "list",
    ApiOperation({ description: "Requires admin role" }),
    ApiOkResponse({ type: [RoleDto], description: "List of roles" }),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "get",
    ApiOperation({ description: "Requires admin role" }),
    ApiOkResponse({ type: RoleDto, description: "Role found" }),
    ApiInvalidRoleIdResponse(),
    ApiRoleNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "update",
    ApiOperation({ description: "Requires admin role. The SUPERUSER role cannot be modified or deleted." }),
    ApiProtectedRoleResponse(),
    ApiOkResponse({ type: RoleDto, description: "Role updated" }),
    ApiInvalidRoleIdResponse(),
    ApiRoleAlreadyExistsResponse(),
    ApiRoleUpdateValidationFailedResponse(),
    ApiRoleNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "delete",
    ApiOperation({ description: "Requires admin role. The SUPERUSER role cannot be modified or deleted." }),
    ApiProtectedRoleResponse(),
    ApiNoContentResponse({ description: "Role deleted" }),
    ApiInvalidRoleIdResponse(),
    ApiRoleNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );
}
