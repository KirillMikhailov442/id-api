import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import type { OAuthTokenResult } from "@modules/oauth/application/port/oauth-token-result.type";

export class TokenResponse {
  @ApiProperty()
  accessToken: string;

  @ApiPropertyOptional({ description: "Issued only with offline_access; rotated on every refresh" })
  refreshToken?: string;

  @ApiPropertyOptional({ description: "ID token issued for authorization_code with openid" })
  idToken?: string;

  @ApiProperty({ example: "Bearer" })
  tokenType = "Bearer";

  @ApiProperty({ description: "Access token lifetime in seconds", example: 900 })
  expiresIn: number;

  @ApiProperty({ format: "uuid" })
  clientId: string;

  @ApiProperty({ format: "uuid" })
  userId: string;

  @ApiProperty({ type: [String] })
  scopes: string[];

  @ApiProperty()
  access_token: string;

  @ApiPropertyOptional()
  refresh_token?: string;

  @ApiPropertyOptional()
  id_token?: string;

  @ApiProperty({ example: "Bearer" })
  token_type = "Bearer";

  @ApiProperty({ example: 900 })
  expires_in: number;

  @ApiProperty({ example: "openid user:read user:write offline_access" })
  scope: string;

  constructor(result: OAuthTokenResult) {
    this.accessToken = this.access_token = result.accessToken;
    this.refreshToken = this.refresh_token = result.refreshToken;
    this.idToken = this.id_token = result.idToken;
    this.expiresIn = this.expires_in = result.expiresIn;
    this.clientId = result.clientId;
    this.userId = result.userId;
    this.scopes = result.scopes;
    this.scope = result.scopes.join(" ");
  }
}
