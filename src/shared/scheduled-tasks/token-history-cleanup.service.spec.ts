import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TokenHistoryCleanupService } from "@shared/scheduled-tasks/token-history-cleanup.service";
import { DataSource } from "typeorm";

describe("TokenHistoryCleanupService", () => {
  const hour = 3600000;
  const day = 24 * hour;
  const now = new Date("2026-01-31T12:00:00Z");
  let service: TokenHistoryCleanupService;
  let database: DataSource;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    database = new DataSource({ type: "postgres" });
    jest.spyOn(database, "query").mockResolvedValue([]);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    service = new TokenHistoryCleanupService(database, new ConfigService({ TOKEN_HISTORY_RETENTION_DAYS: 7 }));
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([1, 7, 30])("uses a %i-day retention cutoff for both token histories", async (days) => {
    service = new TokenHistoryCleanupService(database, new ConfigService({ TOKEN_HISTORY_RETENTION_DAYS: days }));
    await service.cleanup();
    expect(database.query).toHaveBeenCalledTimes(2);

    const cutoff = new Date(now.getTime() - days * day);
    expect(database.query).toHaveBeenNthCalledWith(1, expect.stringContaining("DELETE FROM session_refresh_tokens"), [
      cutoff,
    ]);
    expect(database.query).toHaveBeenNthCalledWith(2, expect.stringContaining("DELETE FROM oauth_refresh_tokens"), [
      cutoff,
    ]);
  });

  it.each([1, 2])("propagates cleanup failure on query %i to direct callers", async (position) => {
    const error = new Error("Database failed");
    const query = jest.spyOn(database, "query");

    if (position === 2) query.mockResolvedValueOnce([]);

    query.mockRejectedValueOnce(error);
    await expect(service.cleanup()).rejects.toBe(error);
    expect(query).toHaveBeenCalledTimes(position);
  });

  it("does not query without retention configuration", async () => {
    service = new TokenHistoryCleanupService(database, new ConfigService());
    await expect(service.cleanup()).rejects.toThrow();
    expect(database.query).not.toHaveBeenCalled();
  });

  it("waits an hour before the first cleanup and repeats hourly", async () => {
    const cleanup = jest.spyOn(service, "cleanup").mockResolvedValue();
    service.onModuleInit();
    expect(cleanup).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(hour - 1);
    expect(cleanup).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(hour);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("skips scheduled runs while a previous cleanup is still pending, then resumes", async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cleanup = jest.spyOn(service, "cleanup").mockReturnValueOnce(pending).mockResolvedValue();
    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(hour * 3);
    expect(cleanup).toHaveBeenCalledTimes(1);
    release();
    await pending;
    await jest.advanceTimersByTimeAsync(hour);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("logs scheduled failures and allows the next run", async () => {
    const cleanup = jest
      .spyOn(service, "cleanup")
      .mockRejectedValueOnce(new Error("Database unavailable"))
      .mockResolvedValue();
    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(hour);
    expect(Logger.prototype.error).toHaveBeenCalledWith("Token history cleanup failed");
    await jest.advanceTimersByTimeAsync(hour);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("cancels the hourly task when the module is destroyed", async () => {
    const cleanup = jest.spyOn(service, "cleanup").mockResolvedValue();
    service.onModuleInit();
    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(hour * 2);
    expect(cleanup).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("can be destroyed before initialization", () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
