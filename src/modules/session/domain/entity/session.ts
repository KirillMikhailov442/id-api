import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { SessionAlreadyRevokedException } from "@modules/session/domain/exception/session-already-revoked.exception";
import type { Browser } from "@modules/session/domain/value-object/browser.value-object";
import type { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import type { Ip } from "@modules/session/domain/value-object/ip.value-object";
import type { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";
import { SessionId } from "@modules/session/session.ids";
import type { UserId } from "@modules/user/user.ids";

export class Session {
  constructor(
    private readonly id: SessionId,
    private readonly userId: UserId,
    private browser: Browser | null,
    private os: OperatingSystem | null,
    private deviceType: DeviceType | null,
    private ip: Ip,
    private readonly createdAt: Date,
    private expiresAt: Date,
    private lastUsedAt: Date,
    private revokedAt: Date | null,
    private refreshTokenCount: number = 1,
    private lastAccessExpiresAt: Date = expiresAt
  ) {
    this.lastAccessExpiresAt = new Date(lastAccessExpiresAt);
    this.lastUsedAt = new Date(lastUsedAt);
  }

  static create(params: {
    userId: UserId;
    browser: Browser | null;
    os: OperatingSystem | null;
    deviceType: DeviceType | null;
    ip: Ip;
    expiresAt: Date;
  }): Session {
    const now = new Date();

    return new Session(
      SessionId.create(),
      params.userId,
      params.browser,
      params.os,
      params.deviceType,
      params.ip,
      now,
      params.expiresAt,
      now,
      null
    );
  }

  getId(): SessionId {
    return this.id;
  }

  getVersion(): number {
    return this.refreshTokenCount;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  getOs(): OperatingSystem | null {
    return this.os;
  }

  getDeviceType(): DeviceType | null {
    return this.deviceType;
  }

  getIp(): Ip {
    return this.ip;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getExpiresAt(): Date {
    return new Date(this.expiresAt);
  }

  getLastUsedAt(): Date {
    return new Date(this.lastUsedAt);
  }

  getLastAccessExpiresAt(): Date {
    return new Date(this.lastAccessExpiresAt);
  }

  recordAccessToken(expiresAt: Date): void {
    this.lastAccessExpiresAt = new Date(expiresAt);
  }

  getRevokedAt(): Date | null {
    return this.revokedAt === null ? null : new Date(this.revokedAt);
  }

  rotate(params: {
    browser: Browser | null;
    os: OperatingSystem | null;
    deviceType: DeviceType | null;
    ip: Ip;
    expiresAt: Date;
    now: Date;
  }): void {
    if (!this.isActive(params.now)) {
      throw new InvalidRefreshTokenException();
    }

    this.refreshTokenCount += 1;
    this.browser = params.browser;
    this.os = params.os;
    this.deviceType = params.deviceType;
    this.ip = params.ip;
    this.expiresAt = new Date(params.expiresAt);
    this.lastUsedAt = new Date(params.now);
  }

  revoke(): void {
    if (this.revokedAt !== null) {
      throw new SessionAlreadyRevokedException();
    }

    this.revokedAt = new Date();
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  isActive(now: Date = new Date()): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }
}
