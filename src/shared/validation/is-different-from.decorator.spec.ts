import { IsDifferentFrom } from "@shared/validation/is-different-from.decorator";
import { validateSync } from "class-validator";

class PasswordChange {
  oldPassword: unknown;
  @IsDifferentFrom("oldPassword")
  newPassword: unknown;
}

class CustomMessage {
  previous: string;
  @IsDifferentFrom("previous", { message: "Choose another value" })
  current: string;
}

describe("IsDifferentFrom", () => {
  it.each(["password", 0, null, undefined])("rejects equal values %p", (value) => {
    const request = Object.assign(new PasswordChange(), { oldPassword: value, newPassword: value });

    expect(validateSync(request)).toEqual([
      expect.objectContaining({
        property: "newPassword",
        constraints: { isDifferentFrom: "newPassword must be different from oldPassword" },
      }),
    ]);
  });

  it("accepts different values", () => {
    expect(validateSync(Object.assign(new PasswordChange(), { oldPassword: "old", newPassword: "new" }))).toEqual([]);
  });

  it("uses a custom validation message", () => {
    const request = Object.assign(new CustomMessage(), { previous: "same", current: "same" });

    expect(validateSync(request)[0]?.constraints).toEqual({ isDifferentFrom: "Choose another value" });
  });
});
