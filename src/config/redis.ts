import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "redis";

@Injectable()
export class RedisConnection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnection.name);
  private readonly client: ReturnType<typeof createClient>;
  private readonly commandTimeout: number;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.commandTimeout = configService.getOrThrow<number>("REDIS_COMMAND_TIMEOUT");
    this.client = createClient({
      url: configService.getOrThrow<string>("REDIS_URL"),
      socket: { connectTimeout: configService.getOrThrow<number>("REDIS_CONNECT_TIMEOUT") },
      disableOfflineQueue: true,
    });
    this.client.on("error", () => this.logger.error("Redis is unavailable"));
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log("Redis connection established");
  }

  onModuleDestroy(): void {
    if (this.client.isOpen) {
      this.client.destroy();
    }
  }

  async execute<T>(work: (client: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
    try {
      if (!this.client.isReady) {
        throw new ServiceUnavailableException("Redis is unavailable");
      }

      return await work(this.client.withCommandOptions({ abortSignal: AbortSignal.timeout(this.commandTimeout) }));
    } catch {
      throw new ServiceUnavailableException("Redis is unavailable");
    }
  }
}
