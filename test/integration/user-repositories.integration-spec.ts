import { databaseFixture, verifyDatabaseLock } from "@test/integration/support";

import { AssignUserRoleCommand } from "@modules/user/application/command/assign-user-role.command";
import { RemoveUserRoleCommand } from "@modules/user/application/command/remove-user-role.command";
import { AssignUserRoleCommandHandler } from "@modules/user/application/handler/assign-user-role.command.handler";
import { GetUserQueryHandler } from "@modules/user/application/handler/get-user.query.handler";
import { ListUsersQueryHandler } from "@modules/user/application/handler/list-users.query.handler";
import { RemoveUserRoleCommandHandler } from "@modules/user/application/handler/remove-user-role.command.handler";
import { makeRole, makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { ListUsersQuery } from "@modules/user/application/query/list-users.query";
import { UserRole } from "@modules/user/domain/entity/user-role";
import { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserRoleChangeForbiddenException } from "@modules/user/domain/exception/user-role-change-forbidden.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { DbUserIdentity } from "@modules/user/infrastructure/entity/db-user-identity.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { DbUserIdentityRepository } from "@modules/user/infrastructure/repository/db-user-identity.repository";
import { RoleId, UserId } from "@modules/user/user.ids";

describe("User repositories and transactions (PostgreSQL)", () => {
  let db: Awaited<ReturnType<typeof databaseFixture>>;

  beforeAll(async () => {
    db = await databaseFixture();
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await db?.close();
  });

  it("rolls back and reapplies the single migration with role seeds and no users", async () => {
    await db.source.undoLastMigration();

    const migrations = await db.source.runMigrations();
    expect(migrations).toHaveLength(1);
    expect(await db.source.query("SELECT name FROM roles ORDER BY name")).toEqual([
      { name: RoleType.Admin },
      { name: RoleType.SuperUser },
      { name: RoleType.User },
    ]);
    expect(await db.source.getRepository(DbUser).count()).toBe(0);
    expect(await db.source.query("SELECT * FROM user_roles")).toEqual([]);

    const constraints = await db.source.query<{ conname: string }[]>(
      "SELECT conname FROM pg_constraint WHERE conrelid = 'session_refresh_tokens'::regclass"
    );
    expect(constraints.map((item) => item.conname)).toContain("UQ_0c088f7a31f53d7421702ba7f2e");
  });

  it("persists users, loads their roles, and queries normalized email", async () => {
    const user = makeUser();
    const role = makeRole();
    await db.users.run(async ({ userRepository: users, roleRepository: roles, userRoleRepository: assignments }) => {
      await users.save(user);
      await roles.save(role);
      await assignments.save(new UserRole(user.getId(), role.getId(), role.getName()));
      expect(await assignments.existsByUserIdAndRoleId(user.getId(), role.getId())).toBe(true);
      expect((await assignments.findByUserId(user.getId())).map((item) => item.getId())).toEqual([role.getId()]);

      const loaded = await users.findById(user.getId());
      expect(loaded?.getEmail().getValue()).toBe(user.getEmail().getValue());
      expect(loaded?.getRoles().map((item) => item.getRoleId())).toEqual([role.getId()]);
      expect((await users.findByEmail(new Email(" ivan@example.com ")))?.getId()).toEqual(user.getId());
      expect(await users.existsByEmail(user.getEmail())).toBe(true);
    });
  });

  it("maps a real email uniqueness violation to a domain exception", async () => {
    await db.users.run(({ userRepository }) => userRepository.save(makeUser()));
    await expect(db.users.run(({ userRepository }) => userRepository.save(makeUser()))).rejects.toThrow(
      EmailAlreadyRegisteredException
    );
  });

  it("maps a real role uniqueness violation to a domain exception", async () => {
    await db.users.run(({ roleRepository }) => roleRepository.save(makeRole()));
    await expect(db.users.run(({ roleRepository }) => roleRepository.save(makeRole()))).rejects.toThrow(
      RoleAlreadyExistsException
    );
  });

  it("filters SUPERUSER only when requested and enforces handler visibility", async () => {
    const first = makeUser("first@example.com");
    const last = makeUser("last@example.com");
    const hidden = makeUser("hidden@example.com");
    const adminRole = makeRole(RoleType.Admin);
    const hiddenRole = makeRole(RoleType.SuperUser);

    await db.users.run(async ({ userRepository: users, roleRepository: roles, userRoleRepository: assignments }) => {
      for (const user of [first, last, hidden]) await users.save(user);

      for (const role of [adminRole, hiddenRole]) await roles.save(role);

      for (const user of [last, hidden]) {
        await assignments.save(new UserRole(user.getId(), adminRole.getId(), adminRole.getName()));
      }

      await assignments.save(new UserRole(hidden.getId(), hiddenRole.getId(), hiddenRole.getName()));
    });
    await db.source.getRepository(DbUser).update(first.getId().getValue(), { createdAt: new Date("2020-01-01") });
    await db.users.run(async ({ userRepository: users, userRoleRepository: assignments }) => {
      expect((await users.findById(hidden.getId()))?.getId()).toEqual(hidden.getId());
      expect(await users.count()).toBe(3);
      expect(await users.findAll({ limit: 10, offset: 0 })).toHaveLength(3);

      const filter = { excludeRole: RoleType.SuperUser };
      expect((await users.findById(first.getId()))?.getId()).toEqual(first.getId());
      expect((await users.findById(last.getId()))?.getRoles().map((role) => role.getRoleId())).toEqual([
        adminRole.getId(),
      ]);
      expect(await users.count(filter)).toBe(2);
      expect((await users.findAll({ limit: 1, offset: 0 }, filter)).map((user) => user.getId())).toEqual([
        last.getId(),
      ]);
      expect((await users.findAll({ limit: 1, offset: 1 }, filter)).map((user) => user.getId())).toEqual([
        first.getId(),
      ]);
      expect(await users.findAll({ limit: 1, offset: 2 }, filter)).toEqual([]);

      const get = new GetUserQueryHandler(users);
      const list = new ListUsersQueryHandler(users);

      for (const roles of [[], [RoleType.User], [RoleType.Admin]]) {
        await expect(get.execute(new GetUserQuery(hidden.getId().getValue(), roles))).rejects.toThrow(
          UserNotFoundException
        );

        const page = await list.execute(new ListUsersQuery(1, 1, roles));
        expect(page.total).toBe(2);
        expect(page.items.map((user) => user.getId())).toEqual([first.getId()]);
      }

      expect(await get.execute(new GetUserQuery(hidden.getId().getValue(), [RoleType.SuperUser]))).toEqual(
        await users.findById(hidden.getId())
      );

      const fullPage = await list.execute(new ListUsersQuery(10, 0, [RoleType.SuperUser]));
      expect(fullPage.total).toBe(3);
      expect(fullPage.items.map((user) => user.getId())).toContainEqual(hidden.getId());

      await assignments.delete(hidden.getId(), hiddenRole.getId());
      expect((await users.findById(hidden.getId()))?.getId()).toEqual(hidden.getId());
      expect(await users.count()).toBe(3);
      expect(await users.findAll({ limit: 10, offset: 0 })).toHaveLength(3);
    });
  });

  it("searches users with literal substrings, consistent pagination and role visibility", async () => {
    const first = makeUser("search_one@example.com");
    const second = makeUser("search.two@example.com");
    const hidden = makeUser("search.hidden@example.com");
    const hiddenRole = makeRole(RoleType.SuperUser);
    await db.users.run(async ({ userRepository: users, roleRepository: roles, userRoleRepository: assignments }) => {
      for (const user of [first, second, hidden]) await users.save(user);

      await roles.save(hiddenRole);
      await assignments.save(new UserRole(hidden.getId(), hiddenRole.getId(), hiddenRole.getName()));
    });
    await db.source.getRepository(DbUser).update(first.getId().getValue(), {
      name: "Alice",
      surname: "Cooper_%\\",
      createdAt: new Date("2020-01-01"),
    });
    await db.source.getRepository(DbUser).update(second.getId().getValue(), { name: "Bob", surname: "Smith" });
    await db.source.getRepository(DbUser).update(hidden.getId().getValue(), { name: "Alice", surname: "Hidden" });

    await db.users.run(async ({ userRepository: users }) => {
      const list = new ListUsersQueryHandler(users);

      for (const search of ["ALIC", "COOPER", "alice coop", "SEARCH_ONE@", "  Alice  ", "%", "_", "\\"]) {
        const page = await list.execute(new ListUsersQuery(10, 0, [RoleType.Admin], search));
        expect(page.total).toBe(1);
        expect(page.items.map((user) => user.getId())).toEqual([first.getId()]);
      }

      const page = await list.execute(new ListUsersQuery(1, 1, [RoleType.Admin], "SEARCH"));
      expect(page.total).toBe(2);
      expect(page.items.map((user) => user.getId())).toEqual([first.getId()]);

      const pastEnd = await list.execute(new ListUsersQuery(1, 2, [RoleType.Admin], "SEARCH"));
      expect(pastEnd).toEqual({ items: [], total: 2 });

      const full = await list.execute(new ListUsersQuery(10, 0, [RoleType.SuperUser], "ALICE"));
      expect(full.total).toBe(2);
      expect(full.items.map((user) => user.getId())).toContainEqual(hidden.getId());

      for (const search of ["", "   "]) {
        const all = await list.execute(new ListUsersQuery(10, 0, [RoleType.Admin], search));
        expect(all.total).toBe(2);
        expect(all.items).toHaveLength(2);
      }

      for (const search of ["missing", "' OR 1=1 --", "search.hidden"]) {
        expect(await list.execute(new ListUsersQuery(10, 0, [RoleType.Admin], search))).toEqual({
          items: [],
          total: 0,
        });
      }
    });
  });

  it("promotes and demotes transactionally while protecting USER and SUPERUSER", async () => {
    const user = makeUser();
    const basic = makeRole(RoleType.User);
    const admin = makeRole(RoleType.Admin);
    const superRole = makeRole(RoleType.SuperUser);
    await db.users.run(async (context) => {
      await context.userRepository.save(user);

      for (const role of [basic, admin, superRole]) await context.roleRepository.save(role);

      await context.userRoleRepository.save(new UserRole(user.getId(), basic.getId(), basic.getName()));
    });

    const assign = new AssignUserRoleCommandHandler(db.users);
    const remove = new RemoveUserRoleCommandHandler(db.users);
    const id = user.getId().getValue();
    const adminId = admin.getId().getValue();
    const loadNames = () =>
      db.users.run(async ({ userRepository }) => {
        const loaded = await userRepository.findById(user.getId());

        return loaded
          ?.getRoles()
          .map((role) => role.getRoleName().getValue())
          .sort();
      });

    await assign.execute(new AssignUserRoleCommand(id, adminId, [RoleType.Admin]));
    expect(await loadNames()).toEqual([RoleType.Admin, RoleType.User]);
    await expect(remove.execute(new RemoveUserRoleCommand(id, adminId, [RoleType.Admin]))).rejects.toThrow(
      UserRoleChangeForbiddenException
    );
    expect(await loadNames()).toEqual([RoleType.Admin, RoleType.User]);
    await remove.execute(new RemoveUserRoleCommand(id, adminId, [RoleType.SuperUser]));
    expect(await loadNames()).toEqual([RoleType.User]);
    await expect(
      assign.execute(new AssignUserRoleCommand(id, superRole.getId().getValue(), [RoleType.SuperUser]))
    ).rejects.toThrow(UserRoleChangeForbiddenException);
    await expect(
      remove.execute(new RemoveUserRoleCommand(id, basic.getId().getValue(), [RoleType.SuperUser]))
    ).rejects.toThrow(UserRoleChangeForbiddenException);
    expect(await loadNames()).toEqual([RoleType.User]);
  });

  it("loads role names, supports empty ID sets, renames and deletes assignments", async () => {
    const user = makeUser();
    const role = makeRole();
    await db.users.run(async ({ userRepository: users, roleRepository: roles, userRoleRepository: assignments }) => {
      await users.save(user);
      await roles.save(role);
      await assignments.save(new UserRole(user.getId(), role.getId(), role.getName()));
      role.rename(new RoleName("reader"));
      await roles.save(role);
      expect((await users.findById(user.getId()))?.getRoles()[0].getRoleName().getValue()).toBe("reader");
      expect((await roles.findByName(new RoleName("reader")))?.getId()).toEqual(role.getId());
      expect((await roles.findByIds([role.getId()])).map((item) => item.getId())).toEqual([role.getId()]);
      expect(await roles.findByIds([])).toEqual([]);
      expect(await roles.findAll()).toHaveLength(1);
      await assignments.delete(user.getId(), role.getId());
      expect(await assignments.existsByUserIdAndRoleId(user.getId(), role.getId())).toBe(false);
    });
  });

  it("uses optimistic password comparison so only one concurrent update wins", async () => {
    const user = makeUser();
    await db.users.run(({ userRepository }) => userRepository.save(user));

    const results = await Promise.all(
      ["first-hash", "second-hash"].map((hash) =>
        db.users.run(async ({ userRepository }) => {
          const loaded = await userRepository.findById(user.getId());

          if (loaded === null) throw new Error("Missing user");

          loaded.changePassword(hash);

          return userRepository.updatePassword(loaded, "password-hash");
        })
      )
    );
    expect(results.sort()).toEqual([false, true]);

    const loaded = await db.users.run(({ userRepository }) => userRepository.findById(user.getId()));
    expect(["first-hash", "second-hash"]).toContain(loaded?.getPasswordHash());
  });

  it("rolls back user, role and identity writes together on failure", async () => {
    const user = makeUser();
    const role = makeRole();
    const error = new Error("Abort");
    await expect(
      db.users.run(async ({ userRepository, roleRepository, userRoleRepository, userIdentityRepository }) => {
        await userRepository.save(user);
        await roleRepository.save(role);
        await userRoleRepository.save(new UserRole(user.getId(), role.getId(), role.getName()));
        await userIdentityRepository.save(IdentityProvider.Google, "subject", user.getId());
        throw error;
      })
    ).rejects.toBe(error);
    await db.users.run(async ({ userRepository, roleRepository, userIdentityRepository }) => {
      expect(await userRepository.findById(user.getId())).toBeNull();
      expect(await roleRepository.findById(role.getId())).toBeNull();
      expect(await userIdentityRepository.findUserId(IdentityProvider.Google, "subject")).toBeNull();
    });
  });

  it("persists external identities, enforces uniqueness, and cascades user deletion", async () => {
    const user = makeUser();
    await db.users.run(async ({ userRepository, userIdentityRepository }) => {
      await userRepository.save(user);
      await userIdentityRepository.save(IdentityProvider.Google, "subject", user.getId());
      expect(await userIdentityRepository.findUserId(IdentityProvider.Google, "subject")).toEqual(user.getId());
    });
    await expect(
      db.users.run(({ userIdentityRepository }) =>
        userIdentityRepository.save(IdentityProvider.Google, "other-subject", user.getId())
      )
    ).rejects.toMatchObject({ code: "23505" });
    await db.users.run(async ({ userRepository, userIdentityRepository }) => {
      await userRepository.delete(user.getId());
      expect(await userIdentityRepository.findUserId(IdentityProvider.Google, "subject")).toBeNull();
    });
  });

  it("serializes concurrent identity creation with a transaction advisory lock", async () => {
    await verifyDatabaseLock(db.source, (manager) =>
      new DbUserIdentityRepository(manager.getRepository(DbUserIdentity)).lock(IdentityProvider.Google, "same-subject")
    );
  });

  it("cascades role deletion and reports missing entities", async () => {
    const user = makeUser();
    const role = makeRole();
    await db.users.run(async ({ userRepository, roleRepository, userRoleRepository }) => {
      await userRepository.save(user);
      await roleRepository.save(role);
      await userRoleRepository.save(new UserRole(user.getId(), role.getId(), role.getName()));
      await roleRepository.delete(role.getId());
      expect(await userRoleRepository.findByUserId(user.getId())).toEqual([]);
      expect(await userRepository.findById(UserId.create())).toBeNull();
    });
    await expect(db.users.run(({ userRepository }) => userRepository.delete(UserId.create()))).rejects.toThrow(
      UserNotFoundException
    );
    await expect(db.users.run(({ roleRepository }) => roleRepository.delete(RoleId.create()))).rejects.toThrow(
      RoleNotFoundException
    );
  });
});
