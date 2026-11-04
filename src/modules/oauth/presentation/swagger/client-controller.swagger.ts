import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { ApiPaginationResponse } from "@shared/pagination/pagination-response.decorator";

import { ClientController } from "@modules/oauth/presentation/controller/v1/client.controller";
import { ClientDto } from "@modules/oauth/presentation/dto/v1/client.dto";
import { ScopeDto } from "@modules/oauth/presentation/dto/v1/scope.dto";
import {
  ApiClientAlreadyActiveResponse,
  ApiClientAlreadyInactiveResponse,
  ApiClientCreateValidationFailedResponse,
  ApiClientNotFoundResponse,
  ApiClientUpdateValidationFailedResponse,
  ApiInvalidClientIdResponse,
  ApiScopeNotAssignedResponse,
  ApiScopeNotFoundResponse,
  ApiScopesValidationFailedResponse,
} from "@modules/oauth/presentation/exception-response.decorator";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import {
  ApiPaginationValidationFailedResponse,
  ApiUnexpectedErrorResponse,
} from "@modules/user/presentation/exception-response.decorator";

type ClientControllerMethod = {
  [K in keyof ClientController]: ClientController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof ClientController];

export class ClientControllerSwagger {
  static register(): void {
    ApiTags("clients")(ClientController);

    this.documentMethod(
      "create",
      ApiAuthenticatedResponse(),
      ApiCreatedResponse({ type: ClientDto, description: "Client created" }),
      ApiClientCreateValidationFailedResponse(),
      ApiScopeNotFoundResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "list",
      ApiAuthenticatedResponse(),
      ApiOperation({ description: "Returns clients owned by the current authenticated user" }),
      ApiQuery({
        name: "search",
        required: false,
        schema: { type: "string", maxLength: 255 },
        description:
          "Case-insensitive substring search by client ID, name or location URL. Whitespace is trimmed; empty search returns all visible clients. Wildcards are literal.",
      }),
      ApiPaginationResponse(ClientDto, "Paginated list of own clients"),
      ApiPaginationValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "listAll",
      ApiAuthenticatedResponse(),
      ApiOperation({ description: "Requires admin role" }),
      ApiQuery({
        name: "search",
        required: false,
        schema: { type: "string", maxLength: 255 },
        description:
          "Case-insensitive substring search by client ID, name or location URL. Whitespace is trimmed; empty search returns all visible clients. Wildcards are literal.",
      }),
      ApiPaginationResponse(ClientDto, "Paginated list of all clients"),
      ApiInsufficientRoleResponse(),
      ApiPaginationValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "get",
      ApiAuthenticatedResponse(),
      ApiOkResponse({ type: ClientDto, description: "Client found" }),
      ApiInvalidClientIdResponse(),
      ApiClientNotFoundResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "update",
      ApiAuthenticatedResponse(),
      ApiOkResponse({ type: ClientDto, description: "Client updated" }),
      ApiInvalidClientIdResponse(),
      ApiClientNotFoundResponse(),
      ApiClientAlreadyActiveResponse(),
      ApiClientAlreadyInactiveResponse(),
      ApiClientUpdateValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "delete",
      ApiAuthenticatedResponse(),
      ApiNoContentResponse({ description: "Client deleted" }),
      ApiInvalidClientIdResponse(),
      ApiClientNotFoundResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "listScopes",
      ApiAuthenticatedResponse(),
      ApiOkResponse({ type: [ScopeDto], description: "Scopes assigned to the client" }),
      ApiInvalidClientIdResponse(),
      ApiClientNotFoundResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "assignScopes",
      ApiAuthenticatedResponse(),
      ApiOkResponse({ type: [ScopeDto], description: "Full set of scopes assigned to the client" }),
      ApiInvalidClientIdResponse(),
      ApiClientNotFoundResponse(),
      ApiScopeNotFoundResponse(),
      ApiScopesValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "unassignScope",
      ApiAuthenticatedResponse(),
      ApiNoContentResponse({ description: "Scope unassigned" }),
      ApiInvalidClientIdResponse(),
      ApiClientNotFoundResponse(),
      ApiScopeNotFoundResponse(),
      ApiScopeNotAssignedResponse(),
      ApiUnexpectedErrorResponse()
    );
  }

  private static documentMethod(name: ClientControllerMethod, ...decorators: MethodDecorator[]): void {
    const descriptor = Object.getOwnPropertyDescriptor(ClientController.prototype, name);

    if (descriptor === undefined) {
      throw new Error(`ClientController.${name} does not exist`);
    }

    for (const decorator of [...decorators].reverse()) {
      decorator(ClientController.prototype, name, descriptor);
    }
  }
}
