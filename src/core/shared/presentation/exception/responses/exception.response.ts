import type { FieldError } from "@core/shared/presentation/exception/field-error";

export class ExceptionResponse {
  status: number;
  message: string;
  path: string;
  timestamp: string;
  errors?: FieldError[];

  constructor(status: number, message: string, path: string, timestamp: string, errors?: FieldError[]) {
    this.status = status;
    this.message = message;
    this.path = path;
    this.timestamp = timestamp;
    this.errors = errors;
  }
}
