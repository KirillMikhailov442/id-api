import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("client_scopes")
@Index("client_scopes_index_0", ["clientId", "scopeId"])
export class DbClientScope {
  @PrimaryColumn("uuid", { name: "client_id" })
  clientId: string;
  @PrimaryColumn("uuid", { name: "scope_id" })
  scopeId: string;
  @Column({ type: "timestamptz", name: "assigned_at" })
  assignedAt: Date;
}
