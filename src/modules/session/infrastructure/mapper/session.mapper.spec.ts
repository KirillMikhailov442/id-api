import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { SessionMapper } from "@modules/session/infrastructure/mapper/session.mapper";

describe("SessionMapper", () => {
  it.each([
    ["Chrome", "Windows", "desktop", "desktop"],
    [null, null, null, null],
    ["unsupported-browser", "unsupported-os", "unsupported-device", null],
    ["Chrome", "Windows", "mobile", "smartphone"],
  ])("restores device information %p/%p/%p", (browser, os, deviceType, expectedDevice) => {
    const stored = Object.assign(new DbSession(), {
      id: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      browser,
      os,
      deviceType,
      ip: "127.0.0.1",
      refreshTokenCount: 4,
      createdAt: new Date("2026-01-01"),
      expiresAt: new Date("2027-01-01"),
      lastUsedAt: new Date("2026-02-01"),
      lastAccessExpiresAt: new Date("2026-02-02"),
      revokedAt: null,
    });
    const domain = SessionMapper.toDomain(stored);

    expect(domain.getVersion()).toBe(4);
    expect(domain.getDeviceType()?.getValue() ?? null).toBe(expectedDevice);
    expect(SessionMapper.toPersistence(domain)).toEqual(
      Object.assign(new DbSession(), {
        ...stored,
        refreshTokenCount: undefined,
        browser: browser === "unsupported-browser" ? null : browser,
        os: os === "unsupported-os" ? null : os,
        deviceType: expectedDevice,
      })
    );
  });

  it("preserves revocation dates", () => {
    const stored = Object.assign(new DbSession(), {
      id: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      browser: null,
      os: null,
      deviceType: null,
      ip: "unknown",
      refreshTokenCount: 1,
      createdAt: new Date("2026-01-01"),
      expiresAt: new Date("2027-01-01"),
      lastUsedAt: new Date("2026-01-01"),
      lastAccessExpiresAt: new Date("2026-01-02"),
      revokedAt: new Date("2026-01-03"),
    });

    expect(SessionMapper.toPersistence(SessionMapper.toDomain(stored)).revokedAt).toEqual(stored.revokedAt);
  });
});
