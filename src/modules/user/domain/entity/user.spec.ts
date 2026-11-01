import { Role } from "@modules/user/domain/entity/role";
import { DEFAULT_AVATAR_PATH, User } from "@modules/user/domain/entity/user";
import { UserRole } from "@modules/user/domain/entity/user-role";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { EmailAlreadyConfirmedException } from "@modules/user/domain/exception/email-already-confirmed.exception";
import { RoleAlreadyAssignedException } from "@modules/user/domain/exception/role-already-assigned.exception";
import { RoleNotAssignedException } from "@modules/user/domain/exception/role-not-assigned.exception";
import { UserAlreadyBlockedException } from "@modules/user/domain/exception/user-already-blocked.exception";
import { UserAlreadyUnblockedException } from "@modules/user/domain/exception/user-already-unblocked.exception";
import { UserRoleChangeForbiddenException } from "@modules/user/domain/exception/user-role-change-forbidden.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";

describe("User", () => {
  let user: User;
  const initialTime = new Date("2026-01-01T00:00:00Z");
  const later = new Date("2026-01-02T00:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(initialTime);
    user = User.create({
      name: new Name("Ivan"),
      surname: new Surname("Ivanov"),
      email: new Email("ivan@example.com"),
      passwordHash: null,
    });
  });

  afterEach(() => jest.useRealTimers());

  it("creates an active unconfirmed user without roles or a local password", () => {
    expect(user.getIsBlocked()).toBe(UserBlockedStatus.Active);
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Unconfirmed);
    expect(user.getRoles()).toEqual([]);
    expect(user.getPasswordHash()).toBeNull();
    expect(user.getAvatar()).toBe(DEFAULT_AVATAR_PATH);
  });

  it("confirms email once and leaves state unchanged on repeated confirmation", () => {
    jest.setSystemTime(later);
    user.confirmEmail();
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Confirmed);
    expect(user.getUpdatedAt()).toEqual(later);
    jest.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    expect(() => user.confirmEmail()).toThrow(EmailAlreadyConfirmedException);
    expect(user.getUpdatedAt()).toEqual(later);
  });

  it("resets confirmation when the email changes", () => {
    user.confirmEmail();
    jest.setSystemTime(later);
    user.updateProfile({ email: new Email("new@example.com") });
    expect(user.getEmail().getValue()).toBe("new@example.com");
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Unconfirmed);
    expect(user.getUpdatedAt()).toEqual(later);
    expect(user.getCreatedAt()).toEqual(initialTime);
  });

  it("updates names without resetting email confirmation or changing omitted fields", () => {
    user.confirmEmail();
    jest.setSystemTime(later);
    user.updateProfile({ name: new Name("Petr"), surname: new Surname("Petrov") });
    expect(user.getName().getValue()).toBe("Petr");
    expect(user.getSurname().getValue()).toBe("Petrov");
    expect(user.getEmail().getValue()).toBe("ivan@example.com");
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Confirmed);
    expect(user.getUpdatedAt()).toEqual(later);
  });

  it.each([{}, { name: new Name("Ivan"), surname: new Surname("Ivanov"), email: new Email(" ivan@example.com ") }])(
    "does not change timestamps or confirmation for an unchanged profile %p",
    (profile) => {
      user.confirmEmail();
      jest.setSystemTime(later);
      user.updateProfile(profile);
      expect(user.getUpdatedAt()).toEqual(initialTime);
      expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Confirmed);
    }
  );

  it("sets and replaces a local password hash", () => {
    user.changePassword("first-hash");
    expect(user.getPasswordHash()).toBe("first-hash");
    jest.setSystemTime(later);
    user.changePassword("second-hash");
    expect(user.getPasswordHash()).toBe("second-hash");
    expect(user.getUpdatedAt()).toEqual(later);
  });

  it("blocks and unblocks with timestamps and rejects repeated transitions", () => {
    expect(() => user.unblock()).toThrow(UserAlreadyUnblockedException);
    jest.setSystemTime(later);
    user.block();
    expect(user.getIsBlocked()).toBe(UserBlockedStatus.Inactive);
    expect(user.getUpdatedAt()).toEqual(later);
    jest.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    expect(() => user.block()).toThrow(UserAlreadyBlockedException);
    expect(user.getUpdatedAt()).toEqual(later);
    user.unblock();
    expect(user.getIsBlocked()).toBe(UserBlockedStatus.Active);
    expect(user.getUpdatedAt()).toEqual(new Date());
    expect(() => user.unblock()).toThrow(UserAlreadyUnblockedException);
  });

  const role = (name: string) => Role.create({ name: new RoleName(name) });

  it("initializes USER and promotes to ADMIN, returning the assignment to persist", () => {
    const basic = role(RoleType.User);
    const admin = role(RoleType.Admin);
    user.assignRole(basic);
    jest.setSystemTime(later);

    const assignment = user.assignRole(admin);
    expect(assignment.getUserId()).toEqual(user.getId());
    expect(assignment.getRoleId()).toEqual(admin.getId());
    expect(assignment.getAppointedAt()).toEqual(later);
    expect(user.getUpdatedAt()).toEqual(later);

    const assigned = user.getRoles();
    assigned.pop();
    expect(user.getRoles()).toHaveLength(2);
    jest.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    expect(() => user.assignRole(admin)).toThrow(RoleAlreadyAssignedException);
    expect(user.getRoles()).toHaveLength(2);
    expect(user.getUpdatedAt()).toEqual(later);
  });

  it("removes ADMIN by identity while preserving USER and updating the timestamp", () => {
    const basic = role(RoleType.User);
    const admin = role(RoleType.Admin);
    user.assignRole(basic);

    const assignment = user.assignRole(admin);
    jest.setSystemTime(later);
    expect(user.removeRole(admin)).toBe(assignment);
    expect(user.getRoles().map((item) => item.getRoleId())).toEqual([basic.getId()]);
    expect(user.getUpdatedAt()).toEqual(later);
    jest.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    expect(() => user.removeRole(admin)).toThrow(RoleNotAssignedException);
    expect(user.getUpdatedAt()).toEqual(later);
  });

  it.each([RoleType.SuperUser, "EDITOR"])("rejects assigning %s even to an uninitialized user", (name) => {
    jest.setSystemTime(later);
    expect(() => user.assignRole(role(name))).toThrow(UserRoleChangeForbiddenException);
    expect(user.getRoles()).toEqual([]);
    expect(user.getUpdatedAt()).toEqual(initialTime);
  });

  it("requires USER before assigning ADMIN", () => {
    expect(() => user.assignRole(role(RoleType.Admin))).toThrow(UserRoleChangeForbiddenException);
    expect(user.getRoles()).toEqual([]);
  });

  it.each([RoleType.User, RoleType.SuperUser, "EDITOR"])("protects %s against role changes", (name) => {
    user.assignRole(role(RoleType.User));

    const roles = user.getRoles();
    jest.setSystemTime(later);
    expect(() => user.assignRole(role(name))).toThrow(UserRoleChangeForbiddenException);
    expect(() => user.removeRole(role(name))).toThrow(UserRoleChangeForbiddenException);
    expect(user.getRoles()).toEqual(roles);
    expect(user.getUpdatedAt()).toEqual(initialTime);
  });

  it("restores an existing SUPERUSER while rejecting every subsequent role change", () => {
    const basic = role(RoleType.User);
    const admin = role(RoleType.Admin);
    const privileged = role(RoleType.SuperUser);
    user = new User(
      user.getId(),
      user.getName(),
      user.getSurname(),
      user.getEmail(),
      user.getPasswordHash(),
      user.getIsConfirmed(),
      user.getIsBlocked(),
      initialTime,
      initialTime,
      [basic, admin, privileged].map((item) => new UserRole(user.getId(), item.getId(), item.getName()))
    );

    const assignments = user.getRoles();
    jest.setSystemTime(later);

    for (const item of [basic, admin, privileged]) {
      expect(() => user.assignRole(item)).toThrow(UserRoleChangeForbiddenException);
      expect(() => user.removeRole(item)).toThrow(UserRoleChangeForbiddenException);
    }

    expect(user.getRoles()).toEqual(assignments);
    expect(user.getUpdatedAt()).toEqual(initialTime);
  });

  it("protects dates returned to callers", () => {
    user.getCreatedAt().setFullYear(2000);
    user.getUpdatedAt().setFullYear(2000);
    expect(user.getCreatedAt()).toEqual(initialTime);
    expect(user.getUpdatedAt()).toEqual(initialTime);
  });
});
