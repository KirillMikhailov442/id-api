import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { AuthController } from "@modules/session/presentation/controller/v1/auth.controller";
import { LoginResponse } from "@modules/session/presentation/dto/v1/login.response";
import { RefreshResponse } from "@modules/session/presentation/dto/v1/refresh.response";
import {
  ApiInvalidCredentialsResponse,
  ApiInvalidRefreshTokenResponse,
  ApiUserBlockedResponse,
} from "@modules/session/presentation/exception-response.decorator";

type AuthControllerMethod = {
  [K in keyof AuthController]: AuthController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof AuthController];

function documentMethod(name: AuthControllerMethod, ...decorators: MethodDecorator[]): void {
  const descriptor = Object.getOwnPropertyDescriptor(AuthController.prototype, name);

  if (descriptor === undefined) {
    throw new Error(`AuthController.${name} does not exist`);
  }

  for (const decorator of [...decorators].reverse()) {
    decorator(AuthController.prototype, name, descriptor);
  }
}

export function registerAuthControllerSwagger(): void {
  ApiTags("auth")(AuthController);

  documentMethod(
    "login",
    ApiOkResponse({
      type: LoginResponse,
      description: "User authenticated. Refresh token is set as httpOnly cookie 'refresh_token'",
    }),
    ApiInvalidCredentialsResponse(),
    ApiUserBlockedResponse()
  );

  documentMethod(
    "refresh",
    ApiOkResponse({
      type: RefreshResponse,
      description: "Access token refreshed. New refresh token is set as httpOnly cookie 'refresh_token'",
    }),
    ApiInvalidRefreshTokenResponse(),
    ApiUserBlockedResponse()
  );

  documentMethod(
    "logout",
    ApiBearerAuth(),
    ApiNoContentResponse({ description: "Current session revoked" }),
    ApiInvalidRefreshTokenResponse()
  );

  documentMethod(
    "logoutAll",
    ApiBearerAuth(),
    ApiNoContentResponse({ description: "All user sessions revoked" }),
    ApiInvalidRefreshTokenResponse()
  );
}
