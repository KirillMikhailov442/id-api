import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { ApiPaginationResponse } from "@shared/pagination/pagination-response.decorator";

import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import { UserController } from "@modules/user/presentation/controller/v1/user.controller";
import { CreateUserResponse } from "@modules/user/presentation/dto/v1/create-user.response";
import { ProfileDto } from "@modules/user/presentation/dto/v1/profile.dto";
import { UserDto } from "@modules/user/presentation/dto/v1/user.dto";
import {
  ApiChangePasswordValidationFailedResponse,
  ApiCreateValidationFailedResponse,
  ApiEmailAlreadyConfirmedResponse,
  ApiEmailAlreadyRegisteredResponse,
  ApiInvalidEmailConfirmationTokenResponse,
  ApiInvalidOldPasswordResponse,
  ApiInvalidUserIdResponse,
  ApiPaginationValidationFailedResponse,
  ApiRoleNotFoundResponse,
  ApiUnexpectedErrorResponse,
  ApiUpdateValidationFailedResponse,
  ApiUserAlreadyBlockedResponse,
  ApiUserAlreadyUnblockedResponse,
  ApiUserNotFoundResponse,
} from "@modules/user/presentation/exception-response.decorator";

type UserControllerMethod = {
  [K in keyof UserController]: UserController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof UserController];

function documentMethod(name: UserControllerMethod, ...decorators: MethodDecorator[]): void {
  const descriptor = Object.getOwnPropertyDescriptor(UserController.prototype, name);

  if (descriptor === undefined) {
    throw new Error(`UserController.${name} does not exist`);
  }

  for (const decorator of [...decorators].reverse()) {
    decorator(UserController.prototype, name, descriptor);
  }
}

export function registerUserControllerSwagger(): void {
  ApiTags("users")(UserController);

  documentMethod(
    "create",
    ApiCreatedResponse({
      type: CreateUserResponse,
      description: "User created. Refresh token is set as httpOnly cookie 'refresh_token'",
    }),
    ApiEmailAlreadyRegisteredResponse(),
    ApiCreateValidationFailedResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "list",
    ApiAuthenticatedResponse(),
    ApiPaginationResponse(UserDto, "Paginated list of users matching search"),
    ApiQuery({
      name: "search",
      required: false,
      schema: { type: "string", maxLength: 255 },
      description:
        "Case-insensitive substring search by name, surname, full name or email. Surrounding whitespace is ignored; empty search returns all visible users. Wildcards are treated literally.",
      example: "ivan",
    }),
    ApiPaginationValidationFailedResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "me",
    ApiAuthenticatedResponse(),
    ApiExtraModels(UserDto, ProfileDto),
    ApiOperation({
      description:
        "Accepts an SSO token or an OAuth token with user:read. OAuth responses contain only id, name, surname and avatar.",
    }),
    ApiOkResponse({ schema: { anyOf: [{ $ref: getSchemaPath(UserDto) }, { $ref: getSchemaPath(ProfileDto) }] } }),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "updateMe",
    ApiAuthenticatedResponse(),
    ApiExtraModels(UserDto, ProfileDto),
    ApiOperation({
      description:
        "Accepts an SSO token or an OAuth token with user:write. OAuth may change only name and surname. Only SSO may change email. Provide at least one field.",
    }),
    ApiOkResponse({ schema: { anyOf: [{ $ref: getSchemaPath(UserDto) }, { $ref: getSchemaPath(ProfileDto) }] } }),
    ApiUpdateValidationFailedResponse(),
    ApiEmailAlreadyRegisteredResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "changePassword",
    ApiAuthenticatedResponse(),
    ApiOperation({ description: "Requires the correct old password" }),
    ApiNoContentResponse({ description: "Password changed" }),
    ApiInvalidOldPasswordResponse(),
    ApiChangePasswordValidationFailedResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "confirmEmail",
    ApiOkResponse({ type: UserDto, description: "Email confirmed" }),
    ApiInvalidEmailConfirmationTokenResponse(),
    ApiEmailAlreadyConfirmedResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "get",
    ApiAuthenticatedResponse(),
    ApiOkResponse({ type: UserDto, description: "User found" }),
    ApiInvalidUserIdResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  for (const method of ["assignRole", "removeRole"] as const) {
    documentMethod(
      method,
      ApiAuthenticatedResponse(),
      ApiOperation({
        description:
          "ADMIN or SUPERUSER may promote a USER; only SUPERUSER may demote an ADMIN. USER is permanent. SUPERUSER cannot be assigned, removed, or have its roles changed. Role IDs refer to the roles catalog.",
      }),
      ApiNoContentResponse({ description: "User role changed" }),
      ApiBadRequestResponse({ description: "Invalid user or role UUID" }),
      ApiForbiddenResponse({ description: "INSUFFICIENT_ROLE or USER_ROLE_CHANGE_FORBIDDEN" }),
      ApiConflictResponse({ description: "ROLE_ALREADY_ASSIGNED or ROLE_NOT_ASSIGNED" }),
      ApiUserNotFoundResponse(),
      ApiRoleNotFoundResponse(),
      ApiUnexpectedErrorResponse()
    );
  }

  documentMethod(
    "update",
    ApiAuthenticatedResponse(),
    ApiOperation({ description: "Requires admin role" }),
    ApiOkResponse({ type: UserDto, description: "User updated" }),
    ApiInsufficientRoleResponse(),
    ApiInvalidUserIdResponse(),
    ApiEmailAlreadyRegisteredResponse(),
    ApiUpdateValidationFailedResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "delete",
    ApiAuthenticatedResponse(),
    ApiNoContentResponse({ description: "User deleted" }),
    ApiInvalidUserIdResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "block",
    ApiAuthenticatedResponse(),
    ApiOperation({ description: "Requires admin role" }),
    ApiOkResponse({ type: UserDto, description: "User blocked" }),
    ApiInsufficientRoleResponse(),
    ApiInvalidUserIdResponse(),
    ApiUserAlreadyBlockedResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );

  documentMethod(
    "unblock",
    ApiAuthenticatedResponse(),
    ApiOperation({ description: "Requires admin role" }),
    ApiOkResponse({ type: UserDto, description: "User unblocked" }),
    ApiInsufficientRoleResponse(),
    ApiInvalidUserIdResponse(),
    ApiUserAlreadyUnblockedResponse(),
    ApiUserNotFoundResponse(),
    ApiUnexpectedErrorResponse()
  );
}
