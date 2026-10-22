import type { Requester } from "@modules/oauth/application/requester.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";

import { RoleType } from "@core/shared/domain/role-type.enum";

export const isAdmin = (roles: string[]): boolean => roles.includes(RoleType.Admin);

export const assertClientAccess = (client: Client, requester: Requester): void => {
  const isOwner = client.getUserId() === requester.userId;

  if (!isOwner && !isAdmin(requester.roles)) {
    throw new ClientNotFoundException();
  }
};
