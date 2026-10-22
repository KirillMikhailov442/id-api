import { ApiProperty } from "@nestjs/swagger";

import type { Location } from "@modules/oauth/domain/entity/location";

const EXAMPLE_ID = "00000000-0000-4000-8000-000000000000";

export class ClientLocationDto {
  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  id: string;

  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  clientId: string;

  @ApiProperty({ maxLength: 255, example: "https://pet-dashboard.example.com/auth/callback" })
  href: string;

  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  createdAt: string;

  static fromDomain(location: Location): ClientLocationDto {
    const dto = new ClientLocationDto();

    dto.id = location.getId();
    dto.clientId = location.getClientId();
    dto.href = location.getHref().getValue();
    dto.createdAt = location.getCreatedAt().toISOString();

    return dto;
  }
}
