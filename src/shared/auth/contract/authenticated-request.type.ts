import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import type { Request } from "express";

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
