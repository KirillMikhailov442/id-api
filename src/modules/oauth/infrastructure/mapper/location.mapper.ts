import { Location } from "@modules/oauth/domain/entity/location";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { DbLocation } from "@modules/oauth/infrastructure/entity/db-location.entity";

export class LocationMapper {
  static toDomain(dbLocation: DbLocation): Location {
    return new Location(dbLocation.id, dbLocation.clientId, new LocationHref(dbLocation.href), dbLocation.createdAt);
  }

  static toPersistence(location: Location): DbLocation {
    const dbLocation = new DbLocation();

    dbLocation.id = location.getId();
    dbLocation.clientId = location.getClientId();
    dbLocation.href = location.getHref().getValue();
    dbLocation.createdAt = location.getCreatedAt();

    return dbLocation;
  }
}
