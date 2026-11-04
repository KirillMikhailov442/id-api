import { Client } from "@modules/oauth/domain/entity/client";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { ScopeMapper } from "@modules/oauth/infrastructure/mapper/scope.mapper";
import { ClientId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

export class ClientMapper {
  static toDomain(dbClient: DbClient): Client {
    return new Client(
      ClientId.from(dbClient.id),
      UserId.from(dbClient.userId),
      new ClientName(dbClient.name),
      dbClient.secretHash,
      dbClient.isActive,
      dbClient.createdAt,
      dbClient.location === null ? null : new LocationHref(dbClient.location),
      dbClient.scopes?.map(ScopeMapper.toDomain)
    );
  }

  static toPersistence(client: Client): DbClient {
    const dbClient = new DbClient();

    dbClient.id = client.getId().getValue();
    dbClient.userId = client.getUserId().getValue();
    dbClient.name = client.getName().getValue();
    dbClient.location = client.getLocation()?.getValue() ?? null;
    dbClient.secretHash = client.getSecretHash();
    dbClient.isActive = client.getIsActive();
    dbClient.createdAt = client.getCreatedAt();

    return dbClient;
  }
}
