import { ApiProperty } from "@nestjs/swagger";

import { UserDto } from "@core/presentation/dto/v1/user.dto";

export class CreateUserResponse {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken: string;

  constructor(user: UserDto, accessToken: string) {
    this.user = user;
    this.accessToken = accessToken;
  }
}
