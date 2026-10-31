import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { HttpStatus } from "@shared/http/http-status.enum";

describe("validationExceptionFactory", () => {
  it.each([
    ["isNotEmpty", "REQUIRED"],
    ["isDefined", "REQUIRED"],
    ["isEmail", "INVALID_EMAIL"],
    ["isUUID", "INVALID_UUID"],
    ["isString", "NOT_A_STRING"],
    ["isNumber", "NOT_A_NUMBER"],
    ["isInt", "NOT_AN_INTEGER"],
    ["isBoolean", "NOT_A_BOOLEAN"],
    ["isDateString", "INVALID_DATE"],
    ["isEnum", "INVALID_VALUE"],
    ["isIn", "INVALID_VALUE"],
    ["isDifferentFrom", "INVALID_VALUE"],
    ["minLength", "TOO_SHORT"],
    ["maxLength", "TOO_LONG"],
    ["length", "INVALID_LENGTH"],
    ["min", "TOO_SMALL"],
    ["max", "TOO_LARGE"],
    ["arrayMaxSize", "TOO_MANY_ITEMS"],
    ["arrayMinSize", "TOO_FEW_ITEMS"],
    ["matches", "INVALID_FORMAT"],
    ["customRule", "CUSTOMRULE"],
  ])("maps %s to %s", (constraint, code) => {
    const exception = validationExceptionFactory([{ property: "field", constraints: { [constraint]: "Invalid" } }]);

    expect(exception.getStatus()).toBe(HttpStatus.Validation);
    expect(exception.getResponse()).toEqual({
      message: "Validation failed",
      errors: [{ field: "field", code, message: "Invalid" }],
    });
  });

  it("keeps field order and joins multiple constraint messages", () => {
    const exception = validationExceptionFactory([
      { property: "email", constraints: { isString: "Must be a string", matches: "Invalid email" } },
      { property: "name" },
    ]);

    expect(exception.getResponse()).toEqual({
      message: "Validation failed",
      errors: [
        { field: "email", code: "NOT_A_STRING", message: "Must be a string; Invalid email" },
        { field: "name", code: "VALIDATION_FAILED", message: "" },
      ],
    });
  });

  it("accepts an empty error list", () => {
    expect(validationExceptionFactory([]).getResponse()).toEqual({ message: "Validation failed", errors: [] });
  });
});
