import { HttpException, Logger, type ArgumentsHost } from "@nestjs/common";
import { DomainException } from "@shared/exception/base/domain.exception";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import { HttpStatus } from "@shared/http/http-status.enum";

class TestDomainException extends DomainException {}

describe("ExceptionFilter", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ url: "/test" }) }),
  } as ArgumentsHost;
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    json.mockClear();
    status.mockClear();
    log = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    [400, "BAD_REQUEST"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "VALIDATION_FAILED"],
    [500, "INTERNAL_SERVER_ERROR"],
    [429, "HTTP_429"],
  ])("maps HTTP status %i to %s", (httpStatus, code) => {
    new ExceptionFilter().catch(new HttpException("Failure", httpStatus), host);

    expect(status).toHaveBeenCalledWith(httpStatus);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: httpStatus,
        code,
        message: "Failure",
        path: "/test",
        timestamp: now.toISOString(),
      })
    );
    expect(log).not.toHaveBeenCalled();
  });

  it.each([
    [{ message: "Denied" }, "Denied"],
    [{ message: ["First", "Second"] }, "First; Second"],
    [{ error: "No message" }, "Http Exception"],
  ])("extracts the message from %p", (body, message) => {
    new ExceptionFilter().catch(new HttpException(body, 400), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });

  it("maps validation bodies to structured field errors", () => {
    const errors = [{ field: "email", code: "invalid_email", message: "Invalid email" }];
    new ExceptionFilter().catch(new HttpException({ errors }, 400), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.Validation);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "VALIDATION_FAILED",
        errors: [{ field: "email", code: "INVALID_EMAIL", message: "Invalid email" }],
      })
    );
  });

  it("preserves a domain error status, code and message", () => {
    new ExceptionFilter().catch(new TestDomainException("Missing", "not_found", HttpStatus.NotFound), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NotFound);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "NOT_FOUND", message: "Missing" }));
  });

  it.each(["email", null])("maps validation domain errors with field %p", (field) => {
    new ExceptionFilter().catch(
      new TestDomainException("Invalid", "invalid_value", HttpStatus.Validation, field),
      host
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [{ field: field ?? "value", code: "INVALID_VALUE", message: "Invalid" }] })
    );
  });

  it.each([new Error("Private database details"), "Private failure", null])("hides unexpected errors %p", (error) => {
    new ExceptionFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INTERNAL_SERVER_ERROR", message: "Internal server error" })
    );
    expect(log).toHaveBeenCalledWith(
      "Unhandled exception",
      error instanceof Error ? error.stack : String(error),
      "ExceptionFilter"
    );
  });
});
