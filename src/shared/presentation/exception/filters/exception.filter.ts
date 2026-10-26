import {
  Catch,
  HttpException,
  Logger,
  HttpStatus as NestHttpStatus,
  type ArgumentsHost,
  type ExceptionFilter as NestExceptionFilter,
} from "@nestjs/common";
import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";
import { FieldError } from "@shared/presentation/exception/field-error";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";
import { ValidationExceptionResponse } from "@shared/presentation/exception/responses/validation-exception.response";
import type { Request, Response } from "express";

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  errors?: FieldError[];
}

const GENERIC_STATUS_CODES: Record<number, string> = {
  [NestHttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [NestHttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [NestHttpStatus.FORBIDDEN]: "FORBIDDEN",
  [NestHttpStatus.NOT_FOUND]: "NOT_FOUND",
  [NestHttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.Validation]: "VALIDATION_FAILED",
  [NestHttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
};

const genericStatusCode = (status: number): string => GENERIC_STATUS_CODES[status] ?? `HTTP_${status}`;

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
        : (this.mapDomainException(exception, path, timestamp) ?? this.mapUnknownException(exception, path, timestamp));

    response.status(exceptionResponse.status).json(exceptionResponse);
  }

  private mapHttpException(exception: HttpException, path: string, timestamp: string): ExceptionResponse {
    const status = exception.getStatus();
    const body = exception.getResponse() as string | HttpExceptionBody;

    if (this.isValidationBody(body)) {
      return new ValidationExceptionResponse(body.errors ?? [], path, timestamp);
    }

    const message = this.extractMessage(body) ?? exception.message;

    return new ExceptionResponse(status, genericStatusCode(status), message, path, timestamp);
  }

  private mapDomainException(exception: unknown, path: string, timestamp: string): ExceptionResponse | undefined {
    if (!(exception instanceof DomainException)) {
      return undefined;
    }

    if (exception.status === HttpStatus.Validation) {
      return new ValidationExceptionResponse(
        [new FieldError(exception.field ?? "value", exception.code, exception.message)],
        path,
        timestamp
      );
    }

    return new ExceptionResponse(exception.status, exception.code, exception.message, path, timestamp);
  }

  private mapUnknownException(exception: unknown, path: string, timestamp: string): ExceptionResponse {
    this.logger.error(
      "Unhandled exception",
      exception instanceof Error ? exception.stack : String(exception),
      ExceptionFilter.name
    );
    return new ExceptionResponse(
      NestHttpStatus.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
      "Internal server error",
      path,
      timestamp
    );
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
