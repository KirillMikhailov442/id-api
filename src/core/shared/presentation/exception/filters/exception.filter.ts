import {
  Catch,
  HttpException,
  Logger,
  HttpStatus as NestHttpStatus,
  type ArgumentsHost,
  type ExceptionFilter as NestExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

import type { FieldError } from "@core/shared/presentation/exception/field-error";
import { HttpStatus } from "@core/shared/presentation/exception/http-status.enum";
import { BadRequestExceptionResponse } from "@core/shared/presentation/exception/responses/bad-request-exception.response";
import { ConflictExceptionResponse } from "@core/shared/presentation/exception/responses/conflict-exception.response";
import { ExceptionResponse } from "@core/shared/presentation/exception/responses/exception.response";
import { ForbiddenExceptionResponse } from "@core/shared/presentation/exception/responses/forbidden-exception.response";
import { NotFoundExceptionResponse } from "@core/shared/presentation/exception/responses/not-found-exception.response";
import { UnauthorizedExceptionResponse } from "@core/shared/presentation/exception/responses/unauthorized-exception.response";
import { ValidationExceptionResponse } from "@core/shared/presentation/exception/responses/validation-exception.response";

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  errors?: FieldError[];
}

type ResponseConstructor = new (
  message: string,
  path: string,
  timestamp: string,
  errors?: FieldError[]
) => ExceptionResponse;

const RESPONSE_FACTORIES: Record<number, ResponseConstructor> = {
  [HttpStatus.BadRequest]: BadRequestExceptionResponse,
  [HttpStatus.Unauthorized]: UnauthorizedExceptionResponse,
  [HttpStatus.Forbidden]: ForbiddenExceptionResponse,
  [HttpStatus.NotFound]: NotFoundExceptionResponse,
  [HttpStatus.Conflict]: ConflictExceptionResponse,
};

@Catch()
export class ExceptionFilter implements NestExceptionFilter {
  private readonly logger = new Logger(ExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;
    const timestamp = new Date().toISOString();

    const exceptionResponse =
      exception instanceof HttpException
        ? this.mapHttpException(exception, path, timestamp)
        : this.mapUnknownException(path, timestamp);

    response.status(exceptionResponse.status).json(exceptionResponse);
  }

  private mapHttpException(exception: HttpException, path: string, timestamp: string): ExceptionResponse {
    const status = exception.getStatus();
    const body = exception.getResponse() as string | HttpExceptionBody;

    if (this.isValidationBody(body)) {
      return new ValidationExceptionResponse(body.errors ?? [], path, timestamp);
    }

    const message = this.extractMessage(body) ?? exception.message;

    const ResponseClass = RESPONSE_FACTORIES[status];
    if (ResponseClass !== undefined) {
      return new ResponseClass(message, path, timestamp);
    }

    return new ExceptionResponse(status, message, path, timestamp);
  }

  private mapUnknownException(path: string, timestamp: string): ExceptionResponse {
    this.logger.error("Unhandled exception", undefined, ExceptionFilter.name);
    return new ExceptionResponse(NestHttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", path, timestamp);
  }

  private isValidationBody(body: string | HttpExceptionBody): body is HttpExceptionBody & { errors: FieldError[] } {
    return typeof body === "object" && body !== null && Array.isArray((body as HttpExceptionBody).errors);
  }

  private extractMessage(body: string | HttpExceptionBody): string | undefined {
    if (typeof body === "string") {
      return body;
    }
    if (Array.isArray(body.message)) {
      return body.message.join("; ");
    }
    return body.message;
  }
}
