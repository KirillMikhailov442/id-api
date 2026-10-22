import {
  Catch,
  HttpException,
  Logger,
  HttpStatus as NestHttpStatus,
  type ArgumentsHost,
  type ExceptionFilter as NestExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { FieldError } from "@core/shared/presentation/exception/field-error";
import { HttpStatus } from "@core/shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@core/shared/presentation/exception/responses/exception.response";
import { ValidationExceptionResponse } from "@core/shared/presentation/exception/responses/validation-exception.response";

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  errors?: FieldError[];
}

const DOMAIN_EXCEPTION_STATUSES: Record<string, number> = {
  UserNotFoundException: HttpStatus.NotFound,
  RoleNotFoundException: HttpStatus.NotFound,
  RoleAlreadyExistsException: HttpStatus.Conflict,
  EmailAlreadyRegisteredException: HttpStatus.Conflict,
  EmailAlreadyConfirmedException: HttpStatus.Conflict,
  InvalidEmailConfirmationTokenException: HttpStatus.BadRequest,
  RoleAlreadyAssignedException: HttpStatus.Conflict,
  UserAlreadyBlockedException: HttpStatus.Conflict,
  UserAlreadyUnblockedException: HttpStatus.Conflict,
  InvalidCredentialsException: HttpStatus.Unauthorized,
  InvalidRefreshTokenException: HttpStatus.Unauthorized,
  SessionNotFoundException: HttpStatus.Unauthorized,
  InvalidAccessTokenException: HttpStatus.Unauthorized,
  AccessTokenExpiredException: HttpStatus.Unauthorized,
  UserBlockedException: HttpStatus.Forbidden,
  InsufficientRoleException: HttpStatus.Forbidden,
  InvalidValueObjectException: HttpStatus.Validation,
  ClientNotFoundException: HttpStatus.NotFound,
  ClientAccessDeniedException: HttpStatus.Forbidden,
  ClientAlreadyActiveException: HttpStatus.Conflict,
  ClientAlreadyInactiveException: HttpStatus.Conflict,
  LocationNotFoundException: HttpStatus.NotFound,
  ScopeNotFoundException: HttpStatus.NotFound,
  ScopeAlreadyExistsException: HttpStatus.Conflict,
  ScopeAlreadyAssignedException: HttpStatus.Conflict,
  ScopeNotAssignedException: HttpStatus.Conflict,
  ClientInactiveException: HttpStatus.Forbidden,
  AuthorizationCodeNotFoundException: HttpStatus.NotFound,
  InvalidAuthorizationCodeException: HttpStatus.BadRequest,
  AuthorizationCodeExpiredException: HttpStatus.BadRequest,
  AuthorizationCodeAlreadyUsedException: HttpStatus.Conflict,
  AuthorizationScopesNotAllowedException: HttpStatus.Validation,
  RedirectUriNotAllowedException: HttpStatus.BadRequest,
  InvalidClientCredentialsException: HttpStatus.Unauthorized,
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

    return new ExceptionResponse(status, message, path, timestamp);
  }

  private mapDomainException(exception: unknown, path: string, timestamp: string): ExceptionResponse | undefined {
    if (!(exception instanceof Error)) {
      return undefined;
    }

    const status = DOMAIN_EXCEPTION_STATUSES[exception.name];
    if (status === undefined) {
      return undefined;
    }

    if (status === HttpStatus.Validation) {
      return new ValidationExceptionResponse([new FieldError("value", exception.message)], path, timestamp);
    }

    return new ExceptionResponse(status, exception.message, path, timestamp);
  }

  private mapUnknownException(exception: unknown, path: string, timestamp: string): ExceptionResponse {
    this.logger.error(
      "Unhandled exception",
      exception instanceof Error ? exception.stack : String(exception),
      ExceptionFilter.name
    );
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
