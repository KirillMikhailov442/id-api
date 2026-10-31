import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TokenHistoryCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenHistoryCleanupService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @InjectDataSource()
    private readonly database: DataSource,
    @Inject(ConfigService)
    private readonly config: ConfigService
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.runScheduledCleanup(), CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  async cleanup(): Promise<void> {
    const retentionDays = this.config.getOrThrow<number>("TOKEN_HISTORY_RETENTION_DAYS");
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

    await this.cleanupSessionTokens(cutoff);
    await this.cleanupOAuthTokens(cutoff);
  }

  private async runScheduledCleanup(): Promise<void> {
    if (this.running) return;

    this.running = true;

    try {
      await this.cleanup();
    } catch {
      this.logger.error("Token history cleanup failed");
    } finally {
      this.running = false;
    }
  }

  private async cleanupSessionTokens(cutoff: Date): Promise<void> {
    await this.database.query(
      `DELETE FROM session_refresh_tokens
       WHERE id IN (
         SELECT t.id
         FROM session_refresh_tokens t
         JOIN sessions s ON s.id = t.session_id
         WHERE (s.expires_at < $1 OR s.revoked_at < $1)
           AND s.last_access_expires_at < now()
         LIMIT 1000
       )`,
      [cutoff]
    );
  }

  private async cleanupOAuthTokens(cutoff: Date): Promise<void> {
    await this.database.query(
      `DELETE FROM oauth_refresh_tokens
       WHERE id IN (
         SELECT t.id
         FROM oauth_refresh_tokens t
         JOIN oauth_grants g ON g.id = t.grant_id
         WHERE (g.expires_at < $1 OR g.revoked_at < $1)
           AND g.last_access_expires_at < now()
         LIMIT 1000
       )`,
      [cutoff]
    );
  }
}
