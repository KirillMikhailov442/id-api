import { ApiProperty } from "@nestjs/swagger";

import type { OAuthGrantSummary } from "@modules/oauth/application/port/oauth-grant-store";
import { OAuthScope } from "@modules/oauth/domain/enum/oauth-scope.enum";

export class OAuthGrantDto {
  @ApiProperty({ format: "uuid", description: "Permission ID to use when revoking access" })
  id: string;

  @ApiProperty({ format: "uuid" })
  clientId: string;

  @ApiProperty({ example: "Calendar app" })
  clientName: string;

  @ApiProperty({ type: [String], example: [OAuthScope.OpenId, OAuthScope.UserRead, OAuthScope.OfflineAccess] })
  scopes: string[];

  @ApiProperty({ format: "date-time", description: "When the authorization code was exchanged and access was granted" })
  createdAt: string;

  @ApiProperty({ format: "date-time", description: "Absolute grant deadline; refresh tokens expire at this deadline" })
  expiresAt: string;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  revokedAt: string | null;

  @ApiProperty({
    enum: ["active", "expired", "revoked"],
    description: "Grant lifecycle status; client/user restrictions are checked separately when accessing the API",
  })
  status: "active" | "expired" | "revoked";

  static fromSummary(grant: OAuthGrantSummary, now: Date): OAuthGrantDto {
    const dto = new OAuthGrantDto();
    dto.id = grant.id.getValue();
    dto.clientId = grant.clientId.getValue();
    dto.clientName = grant.clientName;
    dto.scopes = [...grant.scopes];
    dto.createdAt = grant.createdAt.toISOString();
    dto.expiresAt = grant.expiresAt.toISOString();
    dto.revokedAt = grant.revokedAt?.toISOString() ?? null;
    dto.status =
      grant.revokedAt !== null ? "revoked" : grant.expiresAt.getTime() <= now.getTime() ? "expired" : "active";

    return dto;
  }
}
