import { ApiProperty } from "@nestjs/swagger";

import type { Session } from "@modules/session/domain/entity/session";

export class SessionDto {
  @ApiProperty({ format: "uuid", example: "9e20f958-86cb-4a71-a53a-dab1b026c739" })
  id: string;
  @ApiProperty({ type: String, nullable: true, example: "Windows" })
  os: string | null;
  @ApiProperty({ type: String, nullable: true, example: "Chrome" })
  browser: string | null;
  @ApiProperty({ type: String, nullable: true, example: "desktop" })
  deviceType: string | null;
  @ApiProperty({ format: "date-time", example: "2026-10-28T10:00:00.000Z", description: "Session creation time" })
  createdAt: string;
  @ApiProperty({
    format: "date-time",
    example: "2026-10-28T12:30:00.000Z",
    description: "Session creation time or the last successful refresh time",
  })
  lastUsedAt: string;
  @ApiProperty({ example: true, description: "Matches the session ID in the current access token" })
  isCurrent: boolean;

  static fromDomain(session: Session, currentSessionId: string): SessionDto {
    const dto = new SessionDto();
    const deviceInfo = session.getDeviceInfo();

    dto.id = session.getId();
    dto.os = deviceInfo.os;
    dto.browser = deviceInfo.browser;
    dto.deviceType = deviceInfo.deviceType;
    dto.createdAt = session.getCreatedAt().toISOString();
    dto.lastUsedAt = session.getLastUsedAt().toISOString();
    dto.isCurrent = session.getId() === currentSessionId;

    return dto;
  }
}
