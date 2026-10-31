import type { Requester } from "@modules/oauth/application/type/requester.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { RoleType } from "@modules/user/user.module";

export const isAdmin = (roles: string[]): boolean => roles.includes(RoleType.Admin);

export const assertClientAccess = (client: Client, requester: Requester): void => {
  const isOwner = client.getUserId().equals(UserId.from(requester.userId));

  if (!isOwner && !isAdmin(requester.roles)) {
    throw new ClientNotFoundException();
  }
};
