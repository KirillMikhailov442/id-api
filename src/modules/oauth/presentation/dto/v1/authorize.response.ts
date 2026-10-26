import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const EXAMPLE_CODE = "3Nc9XpQaB7vFk2mZr8Tq1wLd5yHn0JcVe6SbA2RfUiM";

export class AuthorizeResponse {
  @ApiProperty({
    description: "Redirect uri bound to the issued code, the web client must redirect the browser here",
    example: "https://pet-dashboard.example.com/auth/callback",
  })
  redirectUri: string;
  @ApiProperty({ description: "Raw one-time authorization code, shown only once", example: EXAMPLE_CODE })
  code: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: "xyz" })
  state?: string | null;
  @ApiProperty({ format: "date-time", example: "2026-10-21T09:10:00.000Z" })
  expiresAt: string;

  constructor(redirectUri: string, code: string, state: string | null | undefined, expiresAt: Date) {
    this.redirectUri = redirectUri;
    this.code = code;
    this.state = state ?? null;
    this.expiresAt = expiresAt.toISOString();
  }
}
