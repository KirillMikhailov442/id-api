import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { oauthAuth, sessionAuth } from "@shared/testing/auth-test.spec-support";

import { ProfileAccessPolicy } from "@modules/user/application/profile-access.policy";

describe("ProfileAccessPolicy", () => {
  const policy = new ProfileAccessPolicy();
  describe.each([sessionAuth(), oauthAuth()])("$type profile", (auth) => {
    it.each([null, undefined, [], ["name"], "name", 42, true, () => undefined, {}])(
      "rejects an invalid or empty update %p",
      (input) => {
        expect(() => policy.assertCanUpdate(auth, input)).toThrow(BadRequestException);
      }
    );

    it.each([{ name: "Ivan" }, { surname: "Ivanov" }, { name: "Ivan", surname: "Ivanov" }])(
      "allows updating name and surname %p without mutating input",
      (input) => {
        const original = { ...input };
        expect(() => policy.assertCanUpdate(auth, Object.freeze(input))).not.toThrow();
        expect(input).toEqual(original);
      }
    );
  });

  it.each([{ email: "new@example.com" }, { name: "Ivan", surname: "Ivanov", email: "new@example.com" }])(
    "allows email updates from a session %p",
    (input) => {
      expect(() => policy.assertCanUpdate(sessionAuth(), input)).not.toThrow();
    }
  );

  it.each(["email", "roles", "passwordHash", "isBlocked", "isConfirmed", "userId", "unknown"])(
    "rejects OAuth changes to %s even alongside allowed fields",
    (field) => {
      expect(() => policy.assertCanUpdate(oauthAuth(), { [field]: "value" })).toThrow(ForbiddenException);
      expect(() => policy.assertCanUpdate(oauthAuth(), { name: "Ivan", [field]: "value" })).toThrow(ForbiddenException);
    }
  );

  it.each(["roles", "passwordHash", "isBlocked", "isConfirmed", "userId", "unknown"])(
    "rejects unsupported session field %s even alongside allowed fields",
    (field) => {
      expect(() => policy.assertCanUpdate(sessionAuth(), { [field]: "value" })).toThrow(BadRequestException);
      expect(() => policy.assertCanUpdate(sessionAuth(), { email: "new@example.com", [field]: "value" })).toThrow(
        BadRequestException
      );
    }
  );
});
