import { ApiProperty } from "@nestjs/swagger";

import type { Session } from "@modules/session/domain/entity/session";
import { SessionDto } from "@modules/session/presentation/dto/v1/session.dto";
import { SessionId } from "@modules/session/session.ids";

export class AdminSessionDto extends SessionDto {
  @ApiProperty({ format: "uuid" })
  userId: string;

  @ApiProperty({ example: "127.0.0.1" })
  ip: string;

  @ApiProperty({ format: "date-time" })
  expiresAt: string;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  revokedAt: string | null;

  static fromDomain(session: Session, currentSessionId: SessionId): AdminSessionDto {
    return Object.assign(new AdminSessionDto(), SessionDto.fromDomain(session, currentSessionId), {
      userId: session.getUserId().getValue(),
      ip: session.getIp().getValue(),
      expiresAt: session.getExpiresAt().toISOString(),
      revokedAt: session.getRevokedAt()?.toISOString() ?? null,
    });
  }
}
