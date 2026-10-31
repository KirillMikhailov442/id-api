import { SetMetadata } from "@nestjs/common";

export const SESSION_ACCESS_TOKEN_KEY = "session_access_token";

export const SessionAccessToken = () => SetMetadata(SESSION_ACCESS_TOKEN_KEY, true);
