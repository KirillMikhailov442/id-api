import { applyDecorators, type Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";

import { PaginationResponse } from "@shared/presentation/response/pagination.response";

export const ApiPaginationResponse = (itemType: Type<unknown>, description: string) =>
  applyDecorators(
    ApiExtraModels(PaginationResponse, itemType),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginationResponse) },
          { properties: { items: { type: "array", items: { $ref: getSchemaPath(itemType) } } } },
        ],
      },
    })
  );
