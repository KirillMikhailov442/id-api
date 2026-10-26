import { ApiProperty } from "@nestjs/swagger";

export class LoginResponse {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
}
