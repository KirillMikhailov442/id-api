import { Client } from "@modules/oauth/domain/entity/client";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";

export class ClientMapper {
  static toDomain(dbClient: DbClient): Client {
    return new Client(
      dbClient.id,
      dbClient.userId,
      new ClientName(dbClient.name),
      dbClient.secretHash,
      dbClient.isActive,
      dbClient.createdAt
    );
  }

  static toPersistence(client: Client): DbClient {
    const dbClient = new DbClient();

    dbClient.id = client.getId();
    dbClient.userId = client.getUserId();
    dbClient.name = client.getName().getValue();
    dbClient.secretHash = client.getSecretHash();
    dbClient.isActive = client.getIsActive();
    dbClient.createdAt = client.getCreatedAt();

    return dbClient;
  }
}
