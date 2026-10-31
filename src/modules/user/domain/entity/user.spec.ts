import { Role } from "@modules/user/domain/entity/role";
import { DEFAULT_AVATAR_PATH, User } from "@modules/user/domain/entity/user";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { EmailAlreadyConfirmedException } from "@modules/user/domain/exception/email-already-confirmed.exception";
import { RoleAlreadyAssignedException } from "@modules/user/domain/exception/role-already-assigned.exception";
import { UserAlreadyBlockedException } from "@modules/user/domain/exception/user-already-blocked.exception";
import { UserAlreadyUnblockedException } from "@modules/user/domain/exception/user-already-unblocked.exception";
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

  it("assigns roles by identity and protects the role collection from external changes", () => {
    const role = Role.create({ name: new RoleName("admin") });
    jest.setSystemTime(later);
    user.assignRole(role);

    const assigned = user.getRoles();
    expect(assigned).toHaveLength(1);
    expect(assigned[0].getUserId().equals(user.getId())).toBe(true);
    expect(assigned[0].getRoleId().equals(role.getId())).toBe(true);
    expect(assigned[0].getRoleName().getValue()).toBe("admin");
    expect(assigned[0].getAppointedAt()).toEqual(later);
    assigned.pop();
    expect(user.getRoles()).toHaveLength(1);
    jest.setSystemTime(new Date("2026-01-03T00:00:00Z"));

    const rehydrated = new Role(role.getId(), new RoleName("renamed"), initialTime);
    expect(() => user.assignRole(rehydrated)).toThrow(RoleAlreadyAssignedException);
    expect(user.getRoles()).toHaveLength(1);
    expect(user.getUpdatedAt()).toEqual(later);
    user.assignRole(Role.create({ name: new RoleName("reader") }));
    expect(user.getRoles()).toHaveLength(2);
  });

  it("protects dates returned to callers", () => {
    user.getCreatedAt().setFullYear(2000);
    user.getUpdatedAt().setFullYear(2000);
    expect(user.getCreatedAt()).toEqual(initialTime);
    expect(user.getUpdatedAt()).toEqual(initialTime);
  });
});
