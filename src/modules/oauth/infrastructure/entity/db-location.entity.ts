import { Column, Entity, PrimaryColumn } from "typeorm";

import { MAX_LENGTH as LOCATION_HREF_MAX_LENGTH } from "@modules/oauth/domain/value-object/location-href.value-object";

@Entity("locations")
export class DbLocation {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "client_id" })
  clientId: string;

  @Column("varchar", { length: LOCATION_HREF_MAX_LENGTH })
  href: string;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
