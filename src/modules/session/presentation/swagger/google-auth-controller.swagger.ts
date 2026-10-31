import { HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { GoogleAuthController } from "@modules/session/presentation/controller/v1/google-auth.controller";

type GoogleAuthControllerMethod = {
  [K in keyof GoogleAuthController]: GoogleAuthController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof GoogleAuthController];

function documentMethod(name: GoogleAuthControllerMethod, ...decorators: MethodDecorator[]): void {
  const descriptor = Object.getOwnPropertyDescriptor(GoogleAuthController.prototype, name);

  if (descriptor === undefined) {
    throw new Error(`GoogleAuthController.${name} does not exist`);
  }

  for (const decorator of [...decorators].reverse()) {
    decorator(GoogleAuthController.prototype, name, descriptor);
  }
}

export function registerGoogleAuthControllerSwagger(): void {
  ApiTags("auth")(GoogleAuthController);

  documentMethod(
    "start",
    ApiOperation({ summary: "Start Google sign-in or registration" }),
    ApiResponse({ status: HttpStatus.FOUND, description: "Redirect to Google" })
  );

  documentMethod(
    "callback",
    ApiOperation({ summary: "Complete Google sign-in, set refresh cookie and redirect to APP_WEB_URL" }),
    ApiResponse({ status: HttpStatus.FOUND, description: "Refresh cookie set; redirect to SSO home page" }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Invalid or expired Google login" }),
    ApiResponse({ status: HttpStatus.CONFLICT, description: "Email already belongs to an existing account" })
  );
}
