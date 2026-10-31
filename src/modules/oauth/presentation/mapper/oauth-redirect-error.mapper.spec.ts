import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

import { mapOAuthRedirectErrorCode } from "@modules/oauth/presentation/mapper/oauth-redirect-error.mapper";

class TestDomainException extends DomainException {}

describe("mapOAuthRedirectErrorCode", () => {
  it.each([
    ["AUTHORIZATION_CODE_ALREADY_USED", "invalid_grant"],
    ["AUTHORIZATION_CODE_EXPIRED", "invalid_grant"],
    ["AUTHORIZATION_CODE_NOT_FOUND", "invalid_grant"],
    ["INVALID_AUTHORIZATION_CODE", "invalid_grant"],
    ["INVALID_CLIENT_CREDENTIALS", "invalid_client"],
    ["CLIENT_NOT_FOUND", "invalid_client"],
    ["CLIENT_INACTIVE", "unauthorized_client"],
    ["AUTHORIZATION_SCOPES_NOT_ALLOWED", "invalid_scope"],
    ["SCOPE_NOT_FOUND", "invalid_scope"],
    ["CLIENT_ACCESS_DENIED", "access_denied"],
    ["INVALID_VALUE", "invalid_request"],
    ["REDIRECT_URI_NOT_ALLOWED", "invalid_request"],
    ["UNKNOWN_ERROR", undefined],
  ])("maps %s to %s", (code, expected) => {
    expect(mapOAuthRedirectErrorCode(new TestDomainException("Failure", code, HttpStatus.BadRequest))).toBe(expected);
  });
});
