import { ApiProperty } from "@nestjs/swagger";

import { ClientLocationDto } from "@modules/oauth/presentation/dto/v1/client-location.dto";
import { ClientDto } from "@modules/oauth/presentation/dto/v1/client.dto";

export class CreateClientResponse {
  @ApiProperty({ type: ClientDto })
  client: ClientDto;

  @ApiProperty({ type: [ClientLocationDto] })
  locations: ClientLocationDto[];

  constructor(client: ClientDto, locations: ClientLocationDto[]) {
    this.client = client;
    this.locations = locations;
  }
}
