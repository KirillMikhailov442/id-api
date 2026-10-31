import type { AuthContext } from "@shared/auth/contract/auth-context";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import type { Request } from "express";

export type AuthenticatedRequest = Request & { auth?: AuthContext; user?: AuthenticatedUser };
