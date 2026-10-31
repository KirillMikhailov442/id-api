import type { DomainException } from "@shared/exception/base/domain.exception";

import { OAuthErrorCode } from "@modules/oauth/presentation/constants/oauth-error.constants";

const OAUTH_DOMAIN_ERROR_CODES: Record<string, string> = {
  AUTHORIZATION_CODE_ALREADY_USED: OAuthErrorCode.InvalidGrant,
  AUTHORIZATION_CODE_EXPIRED: OAuthErrorCode.InvalidGrant,
  AUTHORIZATION_CODE_NOT_FOUND: OAuthErrorCode.InvalidGrant,
  INVALID_AUTHORIZATION_CODE: OAuthErrorCode.InvalidGrant,
  INVALID_CLIENT_CREDENTIALS: OAuthErrorCode.InvalidClient,
  CLIENT_NOT_FOUND: OAuthErrorCode.InvalidClient,
  CLIENT_INACTIVE: OAuthErrorCode.UnauthorizedClient,
  AUTHORIZATION_SCOPES_NOT_ALLOWED: OAuthErrorCode.InvalidScope,
  SCOPE_NOT_FOUND: OAuthErrorCode.InvalidScope,
  CLIENT_ACCESS_DENIED: OAuthErrorCode.AccessDenied,
  INVALID_VALUE: OAuthErrorCode.InvalidRequest,
  REDIRECT_URI_NOT_ALLOWED: OAuthErrorCode.InvalidRequest,
};

export const mapOAuthRedirectErrorCode = (exception: DomainException): string | undefined =>
  OAUTH_DOMAIN_ERROR_CODES[exception.code];
