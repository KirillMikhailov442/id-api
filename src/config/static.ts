import { join } from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";

export const STATIC_DIRECTORY = join(__dirname, "..", "static");

export const STATIC_URL_PREFIX = "/static/";

export function setupStaticAssets(app: NestExpressApplication): void {
  app.useStaticAssets(STATIC_DIRECTORY, { prefix: STATIC_URL_PREFIX });
  app.useStaticAssets(join(STATIC_DIRECTORY, "images"), { prefix: "/assets/" });
}
