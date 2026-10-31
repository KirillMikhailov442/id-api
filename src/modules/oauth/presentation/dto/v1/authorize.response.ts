import { ApiProperty } from "@nestjs/swagger";

export class AuthorizeResponse {
  @ApiProperty({
    description:
      "Validated client callback URL with the authorization code and optional state; navigate the browser here",
    example: "https://pet-dashboard.example.com/auth/callback?code=authorization-code&state=xyz",
  })
  redirectUrl: string;

  constructor(redirectUrl: string) {
    this.redirectUrl = redirectUrl;
  }
}
