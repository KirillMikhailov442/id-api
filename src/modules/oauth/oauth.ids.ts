import { EntityId } from "@shared/value-object/entity-id.value-object";

export type ClientId = EntityId<"Client">;

export const ClientId = EntityId.forEntity("Client");

export type ScopeId = EntityId<"Scope">;

export const ScopeId = EntityId.forEntity("Scope");

export type AuthorizationCodeId = EntityId<"AuthorizationCode">;

export const AuthorizationCodeId = EntityId.forEntity("AuthorizationCode");

export type OAuthGrantId = EntityId<"OAuthGrant">;

export const OAuthGrantId = EntityId.forEntity("OAuthGrant");

export type OAuthRefreshTokenId = EntityId<"OAuthRefreshToken">;

export const OAuthRefreshTokenId = EntityId.forEntity("OAuthRefreshToken");
