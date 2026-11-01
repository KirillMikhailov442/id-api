import { ApiNoContentResponse, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";

import { SessionController } from "@modules/session/presentation/controller/v1/session.controller";
import { SessionDto } from "@modules/session/presentation/dto/v1/session.dto";
import {
  ApiAuthenticatedResponse,
  ApiInvalidSessionIdResponse,
  ApiSessionNotFoundResponse,
} from "@modules/session/presentation/exception-response.decorator";

type SessionControllerMethod = {
  [K in keyof SessionController]: SessionController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof SessionController];

function documentMethod(name: SessionControllerMethod, ...decorators: MethodDecorator[]): void {
  const descriptor = Object.getOwnPropertyDescriptor(SessionController.prototype, name);

  if (descriptor === undefined) {
    throw new Error(`SessionController.${name} does not exist`);
  }

  for (const decorator of [...decorators].reverse()) {
    decorator(SessionController.prototype, name, descriptor);
  }
}

export function registerSessionControllerSwagger(): void {
  ApiTags("sessions")(SessionController);

  documentMethod(
    "list",
    ApiAuthenticatedResponse(),
    ApiOkResponse({
      type: SessionDto,
      isArray: true,
      description: "Non-revoked, unexpired sessions ordered by last use, newest first",
    })
  );

  documentMethod(
    "revoke",
    ApiAuthenticatedResponse(),
    ApiParam({ name: "id", format: "uuid", description: "Session ID from refresh_tokens" }),
    ApiNoContentResponse({ description: "Session revoked; repeated requests for an owned session also succeed" }),
    ApiInvalidSessionIdResponse(),
    ApiSessionNotFoundResponse()
  );
}
