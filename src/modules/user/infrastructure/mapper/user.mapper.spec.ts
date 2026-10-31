import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { UserMapper } from "@modules/user/infrastructure/mapper/user.mapper";

describe("UserMapper", () => {
  it.each([
    [false, false, null],
    [true, true, "password-hash"],
    [true, false, null],
    [false, true, "password-hash"],
  ])("preserves confirmed=%p, blocked=%p, passwordHash=%p", (emailConfirmed, blocked, passwordHash) => {
    const stored = Object.assign(new DbUser(), {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Ivan",
      surname: "Ivanov",
      email: "ivan@example.com",
      avatar: "/custom-avatar.svg",
      passwordHash,
      emailConfirmed,
      blocked,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-02-01"),
    });
    const domain = UserMapper.toDomain(stored);

    expect(domain.getId().getValue()).toBe(stored.id);
    expect(domain.getIsConfirmed()).toBe(
      emailConfirmed ? UserEmailConfirmedStatus.Confirmed : UserEmailConfirmedStatus.Unconfirmed
    );
    expect(domain.getIsBlocked()).toBe(blocked ? UserBlockedStatus.Inactive : UserBlockedStatus.Active);
    expect(domain.getRoles()).toEqual([]);
    expect(UserMapper.toPersistence(domain)).toEqual({ user: stored, userRoles: [] });
  });

  it("maps joined roles into domain assignments and back", () => {
    const user = Object.assign(new DbUser(), {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Ivan",
      surname: "Ivanov",
      email: "ivan@example.com",
      avatar: "/avatar.svg",
      passwordHash: null,
      emailConfirmed: true,
      blocked: false,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
    const assignment = Object.assign(new DbUserRole(), {
      userId: user.id,
      roleId: "00000000-0000-4000-8000-000000000002",
      appointedAt: new Date("2026-01-02"),
      role: Object.assign(new DbRole(), { name: "admin" }),
    });
    const domain = UserMapper.toDomain(user, [assignment]);

    expect(domain.getRoles()[0]?.getRoleName().getValue()).toBe("admin");
    expect(UserMapper.toPersistence(domain).userRoles).toEqual([
      Object.assign(new DbUserRole(), {
        userId: user.id,
        roleId: assignment.roleId,
        appointedAt: assignment.appointedAt,
      }),
    ]);
  });
});
