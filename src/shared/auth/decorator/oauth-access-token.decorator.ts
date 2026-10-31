import { SetMetadata } from "@nestjs/common";

export const OAUTH_SCOPES_KEY = "oauth_scopes";

export const OAuthAccessToken = (...scopes: [string, ...string[]]) => SetMetadata(OAUTH_SCOPES_KEY, scopes);
