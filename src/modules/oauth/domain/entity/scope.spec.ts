import { Scope } from "@modules/oauth/domain/entity/scope";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";

describe("Scope", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates unique IDs and captures the creation time", () => {
    const now = new Date("2026-01-01");
    jest.useFakeTimers().setSystemTime(now);

    const name = new ScopeName("profile");
    const scope = Scope.create({ name });

    expect(scope.getName()).toBe(name);
    expect(scope.getId().getValue()).not.toBe(Scope.create({ name }).getId().getValue());
    expect(scope.getCreatedAt()).toEqual(now);
    scope.getCreatedAt().setFullYear(2000);
    expect(scope.getCreatedAt()).toEqual(now);
  });
});
