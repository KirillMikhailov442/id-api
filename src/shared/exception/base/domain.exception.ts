import type { HttpStatus } from "@shared/http/http-status.enum";

export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly status: HttpStatus;
  readonly field: string | null = null;
}
