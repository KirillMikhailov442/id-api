import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ILoginAttemptStore, LoginAttempt } from "@modules/session/application/port/login-attempt-store.type";

import { RedisConnection } from "@config/redis";

@Injectable()
export class RedisLoginAttemptStore implements ILoginAttemptStore {
  constructor(
    @Inject(RedisConnection) private readonly redis: RedisConnection,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async save(state: string, browserBinding: string, attempt: LoginAttempt): Promise<void> {
    await this.redis.execute((client) =>
      client.set(this.key(state, browserBinding), JSON.stringify(attempt), {
        EX: this.config.getOrThrow<number>("EXTERNAL_LOGIN_TTL"),
      })
    );
  }

  async consume(state: string, browserBinding: string): Promise<LoginAttempt | null> {
    const value = await this.redis.execute((client) => client.getDel(this.key(state, browserBinding)));

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as LoginAttempt;
  }

  private key(state: string, browserBinding: string): string {
    const digest = createHash("sha256").update(`${state}:${browserBinding}`).digest("hex");

    return `auth:google:attempt:${digest}`;
  }
}
