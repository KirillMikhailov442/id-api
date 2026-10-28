import { randomUUID } from "node:crypto";
import type { DeviceInfo } from "@shared/domain/device-info";

import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { SessionAlreadyRevokedException } from "@modules/session/domain/exception/session-already-revoked.exception";
import type { Ip } from "@modules/session/domain/value-object/ip.value-object";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

export class Session {
  private readonly id: string;
  private readonly userId: string;
  private refreshHash: RefreshHash;
  private deviceInfo: DeviceInfo;
  private ip: Ip;
  private readonly createdAt: Date;
  private expiresAt: Date;
  private lastUsedAt: Date;
  private revokedAt: Date | null;

  constructor(
    id: string,
    userId: string,
    refreshHash: RefreshHash,
    deviceInfo: DeviceInfo,
    ip: Ip,
    createdAt: Date,
    expiresAt: Date,
    lastUsedAt: Date,
    revokedAt: Date | null
  ) {
    this.id = id;
    this.userId = userId;
    this.refreshHash = refreshHash;
    this.deviceInfo = deviceInfo;
    this.ip = ip;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.lastUsedAt = new Date(lastUsedAt);
    this.revokedAt = revokedAt;
  }

  static create(params: {
    userId: string;
    refreshHash: RefreshHash;
    deviceInfo: DeviceInfo;
    ip: Ip;
    expiresAt: Date;
  }): Session {
    const now = new Date();
    return new Session(
      randomUUID(),
      params.userId,
      params.refreshHash,
      params.deviceInfo,
      params.ip,
      now,
      params.expiresAt,
      now,
      null
    );
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.userId;
  }

  getRefreshHash(): RefreshHash {
    return this.refreshHash;
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo;
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

  getRevokedAt(): Date | null {
    return this.revokedAt === null ? null : new Date(this.revokedAt);
  }

  rotate(params: { refreshHash: RefreshHash; deviceInfo: DeviceInfo; ip: Ip; expiresAt: Date; now: Date }): void {
    if (!this.isActive(params.now)) {
      throw new InvalidRefreshTokenException();
    }

    this.refreshHash = params.refreshHash;
    this.deviceInfo = params.deviceInfo;
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
