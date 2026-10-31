import { ApiProperty } from "@nestjs/swagger";

import type { Client } from "@modules/oauth/domain/entity/client";

const EXAMPLE_ID = "00000000-0000-4000-8000-000000000000";

export class ClientDto {
  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  id: string;

  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  userId: string;

  @ApiProperty({ minLength: 2, maxLength: 64, example: "pet-dashboard" })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: "https://pet-dashboard.example.com/auth/callback" })
  location: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  createdAt: string;

  static fromDomain(client: Client): ClientDto {
    const dto = new ClientDto();

    dto.id = client.getId().getValue();
    dto.userId = client.getUserId().getValue();
    dto.name = client.getName().getValue();
    dto.location = client.getLocation()?.getValue() ?? null;
    dto.isActive = client.getIsActive();
    dto.createdAt = client.getCreatedAt().toISOString();

    return dto;
  }
}
