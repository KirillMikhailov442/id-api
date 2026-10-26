import { ApiProperty } from "@nestjs/swagger";

import type { User } from "@modules/user/domain/entity/user";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";

export class UserDto {
  @ApiProperty({ format: "uuid", example: "00000000-0000-4000-8000-000000000000" })
  id: string;
  @ApiProperty({ minLength: 2, maxLength: 64, example: "Ivan" })
  name: string;
  @ApiProperty({ minLength: 2, maxLength: 64, example: "Ivanov" })
  surname: string;
  @ApiProperty({ format: "email", maxLength: 128, example: "ivan.ivanov@example.com" })
  email: string;
  @ApiProperty({ example: false })
  emailConfirmed: boolean;
  @ApiProperty({ example: false })
  blocked: boolean;
  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  createdAt: string;
  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  updatedAt: string;

  static fromDomain(user: User): UserDto {
    const dto = new UserDto();

    dto.id = user.getId();
    dto.name = user.getName().getValue();
    dto.surname = user.getSurname().getValue();
    dto.email = user.getEmail().getValue();
    dto.emailConfirmed = user.getIsConfirmed() === UserEmailConfirmedStatus.Confirmed;
    dto.blocked = user.getIsBlocked() === UserBlockedStatus.Inactive;
    dto.createdAt = user.getCreatedAt().toISOString();
    dto.updatedAt = user.getUpdatedAt().toISOString();

    return dto;
  }
}
