import { EntityId } from "@shared/value-object/entity-id.value-object";

export type UserId = EntityId<"User">;

export const UserId = EntityId.forEntity("User");

export type RoleId = EntityId<"Role">;

export const RoleId = EntityId.forEntity("Role");
