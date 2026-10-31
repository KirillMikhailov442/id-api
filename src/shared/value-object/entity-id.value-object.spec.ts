import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { EntityId } from "@shared/value-object/entity-id.value-object";

describe("EntityId", () => {
  const ids = EntityId.forEntity("Test");
  const uuid = "ABCDEF01-2345-4678-9ABC-DEF012345678";

  it("normalizes UUID case and compares by value", () => {
    expect(ids.from(uuid).getValue()).toBe(uuid.toLowerCase());
    expect(ids.from(uuid).equals(ids.from(uuid.toLowerCase()))).toBe(true);
    expect(ids.from(uuid).equals(ids.create())).toBe(false);
  });

  it("distinguishes entity types sharing the same UUID", () => {
    const first = EntityId.forEntity<string>("First").from(uuid);
    const second = EntityId.forEntity<string>("Second").from(uuid);
    expect(first.equals(second)).toBe(false);
  });

  it("creates unique immutable identifiers and an immutable factory", () => {
    const first = ids.create();
    const second = ids.create();
    expect(first.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first.equals(second)).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(ids)).toBe(true);
  });

  it.each(["", "not-a-uuid", "abcdef01234546789abcdef012345678", ` ${uuid}`, `${uuid} `, null, undefined, 42, {}])(
    "rejects invalid UUID %p",
    (value) => {
      expect(() => ids.from(value as string)).toThrow(InvalidValueObjectException);
    }
  );
});
