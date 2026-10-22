import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import type { Location } from "@modules/oauth/domain/entity/location";
import { DbLocation } from "@modules/oauth/infrastructure/entity/db-location.entity";
import { LocationMapper } from "@modules/oauth/infrastructure/mapper/location.mapper";

export class DbLocationRepository implements ILocationRepository {
  constructor(@InjectRepository(DbLocation) private readonly repository: Repository<DbLocation>) {}

  async findById(id: string): Promise<Location | null> {
    const dbLocation = await this.repository.findOneBy({ id });

    if (dbLocation === null) {
      return null;
    }

    return LocationMapper.toDomain(dbLocation);
  }

  async findByClientId(clientId: string): Promise<Location[]> {
    const dbLocations = await this.repository.find({
      where: { clientId },
      order: { createdAt: "DESC" },
    });

    return dbLocations.map(LocationMapper.toDomain);
  }

  async save(location: Location): Promise<void> {
    await this.repository.save(LocationMapper.toPersistence(location));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByClientId(clientId: string): Promise<void> {
    await this.repository.delete({ clientId });
  }
}
