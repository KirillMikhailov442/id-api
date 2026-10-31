import { ApiProperty } from "@nestjs/swagger";

import type { User } from "@modules/user/domain/entity/user";

/** Profile fields shared with applications; excludes internal account details. */
export class ProfileDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty()
  avatar: string;

  static fromUser(user: User): ProfileDto {
    return Object.assign(new ProfileDto(), {
      id: user.getId().getValue(),
      name: user.getName().getValue(),
      surname: user.getSurname().getValue(),
      avatar: user.getAvatar(),
    });
  }
}
