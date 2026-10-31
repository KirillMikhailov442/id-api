import { EntityId } from "@shared/value-object/entity-id.value-object";

export type SessionId = EntityId<"Session">;

export const SessionId = EntityId.forEntity("Session");

export type SessionRefreshTokenId = EntityId<"SessionRefreshToken">;

export const SessionRefreshTokenId = EntityId.forEntity("SessionRefreshToken");
