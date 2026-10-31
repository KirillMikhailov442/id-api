import { ApiProperty } from "@nestjs/swagger";

import type { Session } from "@modules/session/domain/entity/session";
import { BROWSER_NAME_MAX_LENGTH } from "@modules/session/domain/value-object/browser.value-object";
import { DEVICE_TYPE_NAME_MAX_LENGTH } from "@modules/session/domain/value-object/device-type.value-object";
import { OPERATING_SYSTEM_NAME_MAX_LENGTH } from "@modules/session/domain/value-object/operating-system.value-object";
import { SessionId } from "@modules/session/session.ids";

export class SessionDto {
  @ApiProperty({ format: "uuid", example: "9e20f958-86cb-4a71-a53a-dab1b026c739" })
  id: string;

  @ApiProperty({ type: String, maxLength: OPERATING_SYSTEM_NAME_MAX_LENGTH, nullable: true, example: "Windows" })
  os: string | null;

  @ApiProperty({ type: String, maxLength: BROWSER_NAME_MAX_LENGTH, nullable: true, example: "Chrome" })
  browser: string | null;

  @ApiProperty({ type: String, maxLength: DEVICE_TYPE_NAME_MAX_LENGTH, nullable: true, example: "desktop" })
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

  static fromDomain(session: Session, currentSessionId: SessionId): SessionDto {
    const dto = new SessionDto();

    dto.id = session.getId().getValue();
    dto.os = session.getOs()?.getValue() ?? null;
    dto.browser = session.getBrowser()?.getValue() ?? null;
    dto.deviceType = session.getDeviceType()?.getValue() ?? null;
    dto.createdAt = session.getCreatedAt().toISOString();
    dto.lastUsedAt = session.getLastUsedAt().toISOString();
    dto.isCurrent = session.getId().equals(currentSessionId);

    return dto;
  }
}
