import type { Location } from "@modules/oauth/domain/entity/location";

export interface ILocationRepository {
  findById(id: string): Promise<Location | null>;
  findByClientId(clientId: string): Promise<Location[]>;
  save(location: Location): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByClientId(clientId: string): Promise<void>;
}
