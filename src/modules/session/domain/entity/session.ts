import { randomUUID } from "node:crypto";

import { SessionAlreadyRevokedException } from "@modules/session/domain/exception/session-already-revoked.exception";
import type { Ip } from "@modules/session/domain/value-object/ip.value-object";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import type { UserAgent } from "@modules/session/domain/value-object/user-agent.value-object";

export class Session {
  private readonly id: string;
  private readonly userId: string;
  private readonly refreshHash: RefreshHash;
  private readonly userAgent: UserAgent;
  private readonly ip: Ip;
  private readonly createdAt: Date;
  private readonly expiresAt: Date;
  private readonly familyId: string;
  private revokedAt: Date | null;

  constructor(
    id: string,
    userId: string,
    refreshHash: RefreshHash,
    userAgent: UserAgent,
    ip: Ip,
    createdAt: Date,
    expiresAt: Date,
    familyId: string,
    revokedAt: Date | null
  ) {
    this.id = id;
    this.userId = userId;
    this.refreshHash = refreshHash;
    this.userAgent = userAgent;
    this.ip = ip;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.familyId = familyId;
    this.revokedAt = revokedAt;
  }

  static create(params: {
    userId: string;
    refreshHash: RefreshHash;
    userAgent: UserAgent;
    ip: Ip;
    expiresAt: Date;
    familyId?: string;
  }): Session {
    return new Session(
      randomUUID(),
      params.userId,
      params.refreshHash,
      params.userAgent,
      params.ip,
      new Date(),
      params.expiresAt,
      params.familyId ?? randomUUID(),
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

  getUserAgent(): UserAgent {
    return this.userAgent;
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

  getFamilyId(): string {
    return this.familyId;
  }

  getRevokedAt(): Date | null {
    return this.revokedAt === null ? null : new Date(this.revokedAt);
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
