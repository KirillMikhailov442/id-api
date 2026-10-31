import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiPaginationResponse } from "@shared/pagination/pagination-response.decorator";

import { ScopeController } from "@modules/oauth/presentation/controller/v1/scope.controller";
import { ScopeDto } from "@modules/oauth/presentation/dto/v1/scope.dto";
import {
  ApiScopeAlreadyExistsResponse,
  ApiScopeCreateValidationFailedResponse,
} from "@modules/oauth/presentation/exception-response.decorator";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import {
  ApiPaginationValidationFailedResponse,
  ApiUnexpectedErrorResponse,
} from "@modules/user/presentation/exception-response.decorator";

type ScopeControllerMethod = {
  [K in keyof ScopeController]: ScopeController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof ScopeController];

export class ScopeControllerSwagger {
  static register(): void {
    ApiTags("scopes")(ScopeController);

    this.documentMethod(
      "list",
      ApiAuthenticatedResponse(),
      ApiPaginationResponse(ScopeDto, "Paginated list of scopes"),
      ApiPaginationValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "create",
      ApiAuthenticatedResponse(),
      ApiOperation({ description: "Requires admin role" }),
      ApiCreatedResponse({ type: ScopeDto, description: "Scope created" }),
      ApiInsufficientRoleResponse(),
      ApiScopeAlreadyExistsResponse(),
      ApiScopeCreateValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );
  }

  private static documentMethod(name: ScopeControllerMethod, ...decorators: MethodDecorator[]): void {
    const descriptor = Object.getOwnPropertyDescriptor(ScopeController.prototype, name);

    if (descriptor === undefined) {
      throw new Error(`ScopeController.${name} does not exist`);
    }

    for (const decorator of [...decorators].reverse()) {
      decorator(ScopeController.prototype, name, descriptor);
    }
  }
}
