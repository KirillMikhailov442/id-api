import type { Request } from "express";

import type { AuthenticatedUser } from "@core/shared/presentation/auth/authenticated-user.type";

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
