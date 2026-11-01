import { databaseFixture, verifyDatabaseLock } from "@test/integration/support";

import { makeRole, makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { SUPER_USER_EMAIL } from "@modules/user/domain/entity/user";
import { UserRole } from "@modules/user/domain/entity/user-role";
import { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
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

  it("excludes the super user from paginated listings and counts", async () => {
    const first = makeUser("first@example.com");
    const last = makeUser("last@example.com");
    await db.users.run(async ({ userRepository: users }) => {
      for (const user of [first, last, makeUser(SUPER_USER_EMAIL)]) await users.save(user);
    });
    await db.source.getRepository(DbUser).update(first.getId().getValue(), { createdAt: new Date("2020-01-01") });
    await db.users.run(async ({ userRepository: users }) => {
      expect(await users.count()).toBe(2);
      expect((await users.findAll({ limit: 1, offset: 0 })).map((user) => user.getId())).toEqual([last.getId()]);
      expect((await users.findAll({ limit: 1, offset: 1 })).map((user) => user.getId())).toEqual([first.getId()]);
      expect(await users.findAll({ limit: 1, offset: 2 })).toEqual([]);
    });
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
