import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "@shared/auth/decorator/roles.decorator";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import { authContext, oauthAuth, sessionAuth } from "@shared/testing/auth-test.spec-support";

import { InsufficientRoleException } from "@modules/session/domain/exception/insufficient-role.exception";
import { RolesGuard } from "@modules/session/presentation/guard/roles.guard";

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());

  it.each([{ roles: undefined }, { roles: [] }])("allows endpoints without role requirements %p", ({ roles }) => {
    const fixture = authContext();

    if (roles !== undefined) Reflect.defineMetadata(ROLES_KEY, roles, fixture.handler);

    expect(guard.canActivate(fixture.context)).toBe(true);
  });

  it("rejects requests without authentication even if legacy user data contains the required role", () => {
    const fixture = authContext();
    Reflect.defineMetadata(ROLES_KEY, ["ADMIN"], fixture.handler);
    fixture.request.user = sessionAuth(["ADMIN"]);
    expect(() => guard.canActivate(fixture.context)).toThrow(InvalidAccessTokenException);
  });

  it.each([[], ["USER"], ["admin"]].map((roles) => ({ roles })))(
    "rejects sessions without a matching role %p",
    ({ roles }) => {
      const fixture = authContext();
      Reflect.defineMetadata(ROLES_KEY, ["ADMIN"], fixture.handler);
      fixture.request.auth = sessionAuth(roles);
      expect(() => guard.canActivate(fixture.context)).toThrow(InsufficientRoleException);
    }
  );

  it.each(["handler", "controller"] as const)("allows any one required role declared on the %s", (target) => {
    const fixture = authContext();
    Reflect.defineMetadata(ROLES_KEY, ["ADMIN", "EDITOR"], fixture[target]);
    fixture.request.auth = sessionAuth(["USER", "EDITOR"]);
    expect(guard.canActivate(fixture.context)).toBe(true);
  });

  it("does not treat OAuth scopes or legacy session roles as session authorization", () => {
    const fixture = authContext();
    Reflect.defineMetadata(ROLES_KEY, ["ADMIN"], fixture.handler);
    fixture.request.auth = oauthAuth(["ADMIN"]);
    fixture.request.user = sessionAuth(["ADMIN"]);
    expect(() => guard.canActivate(fixture.context)).toThrow(InsufficientRoleException);
  });

  it("lets method roles override controller roles", () => {
    const fixture = authContext();
    Reflect.defineMetadata(ROLES_KEY, ["ADMIN"], fixture.controller);
    Reflect.defineMetadata(ROLES_KEY, ["EDITOR"], fixture.handler);
    fixture.request.auth = sessionAuth(["EDITOR"]);
    expect(guard.canActivate(fixture.context)).toBe(true);
    fixture.request.auth = sessionAuth(["ADMIN"]);
    expect(() => guard.canActivate(fixture.context)).toThrow(InsufficientRoleException);
  });

  it("allows an explicit empty method role list to override controller requirements", () => {
    const fixture = authContext();
    Reflect.defineMetadata(ROLES_KEY, ["ADMIN"], fixture.controller);
    Reflect.defineMetadata(ROLES_KEY, [], fixture.handler);
    expect(guard.canActivate(fixture.context)).toBe(true);
  });
});
