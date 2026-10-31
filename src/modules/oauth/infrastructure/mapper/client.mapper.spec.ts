import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { ClientMapper } from "@modules/oauth/infrastructure/mapper/client.mapper";

describe("ClientMapper", () => {
  it.each([null, "https://app.example.com/callback"])("preserves callback location %p", (location) => {
    const stored = Object.assign(new DbClient(), {
      id: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      name: "Test client",
      secretHash: "hashed-secret",
      isActive: false,
      createdAt: new Date("2026-01-01"),
      location,
    });
    const domain = ClientMapper.toDomain(stored);

    expect(domain.getId().getValue()).toBe(stored.id);
    expect(domain.getUserId().getValue()).toBe(stored.userId);
    expect(domain.getName().getValue()).toBe("Test client");
    expect(domain.getLocation()?.getValue() ?? null).toBe(location);
    expect(domain.getIsActive()).toBe(false);
    expect(ClientMapper.toPersistence(domain)).toEqual(stored);
  });
});
