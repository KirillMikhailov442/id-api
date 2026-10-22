import { ApiProperty } from "@nestjs/swagger";

const EXAMPLE_ID = "00000000-0000-4000-8000-000000000000";
const EXAMPLE_ID_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDAiLCJzY29wZSI6Im9wZW5pZCIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImF1ZCI6IjAwMDAwMDAwLTAwMDAtNDAwMC04MDAwLTAwMDAwMDAwMDAwMCJ9.X";
const TOKEN_TYPE_BEARER = "Bearer";

export class TokenResponse {
  @ApiProperty({ description: "Signed OpenID Connect id token of the resource owner", example: EXAMPLE_ID_TOKEN })
  idToken: string;

  @ApiProperty({ example: TOKEN_TYPE_BEARER })
  tokenType: string;

  @ApiProperty({ description: "Id token lifetime in seconds", example: 3600 })
  expiresIn: number;

  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  clientId: string;

  @ApiProperty({ format: "uuid", example: EXAMPLE_ID, description: "Resource owner who approved the client" })
  userId: string;

  @ApiProperty({ type: [String], example: ["openid", "profile"], description: "Granted scopes" })
  scopes: string[];

  constructor(idToken: string, expiresIn: number, clientId: string, userId: string, scopes: string[]) {
    this.idToken = idToken;
    this.tokenType = TOKEN_TYPE_BEARER;
    this.expiresIn = expiresIn;
    this.clientId = clientId;
    this.userId = userId;
    this.scopes = scopes;
  }
}
