import { mockFn } from "@shared/testing/handler-test.spec-support";

import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import type { ITransactionContext } from "@modules/user/application/port/transaction.port";
import type { IUserIdentityRepository } from "@modules/user/application/port/user-identity-repository.type";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import type { IUserRoleRepository } from "@modules/user/application/port/user-role-repository";
import { Role } from "@modules/user/domain/entity/role";
import { User } from "@modules/user/domain/entity/user";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";

export function makeUser(email = "ivan@example.com", passwordHash: string | null = "password-hash") {
  return User.create({ name: new Name("Ivan"), surname: new Surname("Ivanov"), email: new Email(email), passwordHash });
}

export function makeRole(name = "user") {
  return Role.create({ name: new RoleName(name) });
}

export function userRepositories() {
  const userRepository = {
    findById: mockFn<IUserRepository["findById"]>(),
    save: mockFn<IUserRepository["save"]>(),
    delete: mockFn<IUserRepository["delete"]>(),
    findAll: mockFn<IUserRepository["findAll"]>(),
    count: mockFn<IUserRepository["count"]>(),
    findByEmail: mockFn<IUserRepository["findByEmail"]>(),
    existsByEmail: mockFn<IUserRepository["existsByEmail"]>(),
    updatePassword: mockFn<IUserRepository["updatePassword"]>(),
  };
  const roleRepository = {
    findById: mockFn<IRoleRepository["findById"]>(),
    save: mockFn<IRoleRepository["save"]>(),
    delete: mockFn<IRoleRepository["delete"]>(),
    findAll: mockFn<IRoleRepository["findAll"]>(),
    findByIds: mockFn<IRoleRepository["findByIds"]>(),
    findByName: mockFn<IRoleRepository["findByName"]>(),
  };
  const userRoleRepository = {
    save: mockFn<IUserRoleRepository["save"]>(),
    existsByUserIdAndRoleId: mockFn<IUserRoleRepository["existsByUserIdAndRoleId"]>(),
    findByUserId: mockFn<IUserRoleRepository["findByUserId"]>(),
    delete: mockFn<IUserRoleRepository["delete"]>(),
  };
  const userIdentityRepository = {
    lock: mockFn<IUserIdentityRepository["lock"]>(),
    findUserId: mockFn<IUserIdentityRepository["findUserId"]>(),
    save: mockFn<IUserIdentityRepository["save"]>(),
  };
  const context = { userRepository, roleRepository, userRoleRepository, userIdentityRepository };
  const transaction = { run: <T>(work: (context: ITransactionContext) => Promise<T>): Promise<T> => work(context) };

  return { ...context, transaction };
}
