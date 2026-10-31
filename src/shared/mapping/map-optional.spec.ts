import { mapOptional } from "@shared/mapping/map-optional";

describe("mapOptional", () => {
  it("does not call the transform for undefined", () => {
    const transform = jest.fn();

    expect(mapOptional(undefined, transform)).toBeUndefined();
    expect(transform).not.toHaveBeenCalled();
  });

  it.each([null, false, 0, ""])("transforms a defined value %p exactly once", (value) => {
    const transform = jest.fn(() => "mapped");

    expect(mapOptional(value, transform)).toBe("mapped");
    expect(transform).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledWith(value);
  });

  it("propagates a transform error", () => {
    const error = new Error("Mapping failed");

    expect(() =>
      mapOptional(1, () => {
        throw error;
      })
    ).toThrow(error);
  });
});
