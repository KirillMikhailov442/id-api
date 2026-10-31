import { Session } from "@modules/session/domain/entity/session";
import { BROWSER_NAMES } from "@modules/session/domain/enum/browser.enum";
import { DEVICE_TYPE_NAMES } from "@modules/session/domain/enum/device-type.enum";
import { OPERATING_SYSTEM_NAMES } from "@modules/session/domain/enum/operating-system.enum";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { SessionAlreadyRevokedException } from "@modules/session/domain/exception/session-already-revoked.exception";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";
import { UserId } from "@modules/user/user.ids";

describe("Session", () => {
  let session: Session;
  const now = new Date("2026-01-01T00:00:00Z");
  const expiresAt = new Date("2026-01-02T00:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    session = Session.create({
      userId: UserId.create(),
      browser: null,
      os: null,
      deviceType: null,
      ip: new Ip("127.0.0.1"),
      expiresAt,
    });
  });

  afterEach(() => jest.useRealTimers());

  const rotation = () => ({
    browser: new Browser([...BROWSER_NAMES][0]),
    os: new OperatingSystem([...OPERATING_SYSTEM_NAMES][0]),
    deviceType: new DeviceType([...DEVICE_TYPE_NAMES][0]),
    ip: new Ip("::1"),
    now: new Date("2026-01-01T01:00:00Z"),
    expiresAt: new Date("2026-01-03T00:00:00Z"),
  });

  it("creates an active session at version one", () => {
    expect(session.isActive()).toBe(true);
    expect(session.isRevoked()).toBe(false);
    expect(session.getRevokedAt()).toBeNull();
    expect(session.getVersion()).toBe(1);
    expect(session.getCreatedAt()).toEqual(now);
    expect(session.getLastUsedAt()).toEqual(now);
  });

  it.each([
    [-1, false],
    [0, true],
    [1, true],
  ])("checks expiry at a %i ms offset", (offset, expired) => {
    const time = new Date(expiresAt.getTime() + offset);
    expect(session.isExpired(time)).toBe(expired);
    expect(session.isActive(time)).toBe(!expired);
    jest.setSystemTime(time);
    expect(session.isExpired()).toBe(expired);
  });

  it("rotates tokens, advances the version and updates device details and expiry", () => {
    const params = rotation();
    session.rotate(params);
    expect(session.getVersion()).toBe(2);
    expect(session.getBrowser()).toBe(params.browser);
    expect(session.getOs()).toBe(params.os);
    expect(session.getDeviceType()).toBe(params.deviceType);
    expect(session.getIp()).toBe(params.ip);
    expect(session.getLastUsedAt()).toEqual(params.now);
    expect(session.getExpiresAt()).toEqual(params.expiresAt);
    expect(session.getCreatedAt()).toEqual(now);
    session.rotate({ ...params, browser: null, os: null, deviceType: null });
    expect(session.getVersion()).toBe(3);
    expect(session.getBrowser()).toBeNull();
    expect(session.getOs()).toBeNull();
    expect(session.getDeviceType()).toBeNull();
  });

  it.each(["expired", "revoked"])("rejects rotation of a %s session without changing it", (state) => {
    const params = rotation();

    if (state === "revoked") session.revoke();
    else params.now = expiresAt;

    expect(() => session.rotate(params)).toThrow(InvalidRefreshTokenException);
    expect(session.getVersion()).toBe(1);
    expect(session.getExpiresAt()).toEqual(expiresAt);
    expect(session.getLastUsedAt()).toEqual(now);
    expect(session.getIp().getValue()).toBe("127.0.0.1");
  });

  it("revokes once and preserves the original revocation time", () => {
    session.revoke();
    expect(session.isActive()).toBe(false);
    expect(session.isRevoked()).toBe(true);
    expect(session.getRevokedAt()).toEqual(now);
    jest.setSystemTime(expiresAt);
    expect(() => session.revoke()).toThrow(SessionAlreadyRevokedException);
    expect(session.getRevokedAt()).toEqual(now);
  });

  it("records access token expiry independently of refresh expiry and version", () => {
    const accessExpiry = new Date("2026-01-01T00:15:00Z");
    session.recordAccessToken(accessExpiry);
    accessExpiry.setFullYear(2000);
    expect(session.getLastAccessExpiresAt()).toEqual(new Date("2026-01-01T00:15:00Z"));
    session.rotate(rotation());
    expect(session.getLastAccessExpiresAt()).toEqual(new Date("2026-01-01T00:15:00Z"));
  });

  it("copies rotation dates and protects dates exposed to callers", () => {
    const params = rotation();
    session.rotate(params);

    const expectedExpiry = new Date(params.expiresAt);
    const expectedLastUsed = new Date(params.now);
    params.expiresAt.setFullYear(2000);
    params.now.setFullYear(2000);
    session.getExpiresAt().setFullYear(2000);
    session.getLastUsedAt().setFullYear(2000);
    session.getCreatedAt().setFullYear(2000);
    session.getLastAccessExpiresAt().setFullYear(2000);
    expect(session.getExpiresAt()).toEqual(expectedExpiry);
    expect(session.getLastUsedAt()).toEqual(expectedLastUsed);
    expect(session.getCreatedAt()).toEqual(now);
    expect(session.getLastAccessExpiresAt()).toEqual(expiresAt);
    session.revoke();
    session.getRevokedAt()?.setFullYear(2000);
    expect(session.getRevokedAt()).toEqual(now);
  });
});
