import type { AuthenticatedUser } from "@shared/presentation/auth/authenticated-user.type";
import type { Request } from "express";

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
