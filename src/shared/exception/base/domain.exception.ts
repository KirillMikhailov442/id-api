import type { HttpStatus } from "@shared/http/http-status.enum";

export abstract class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: HttpStatus,
    public readonly field: string | null = null
  ) {
    super(message);
  }
}
