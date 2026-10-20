import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("roles")
export class DbRole {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar", { length: 32, unique: true })
  name: string;

  @Column("timestamptz")
  createdAt: Date;
}
