import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import type { IUserRoleRepository } from "@modules/user/application/port/user-role-repository";

/**
 * Явные поля репозиториев вместо дженерик-локатора get(token):
 * полная типобезопасность, ноль магии, интерфейс растёт на одно поле
 * с каждым новым агрегатом. Я что-то лучше пока не придумал.
 * Выбрано вместо токен-локатора — 20.10.2026.
 */
export interface ITransactionContext {
  readonly userRepository: IUserRepository;
  readonly roleRepository: IRoleRepository;
  readonly userRoleRepository: IUserRoleRepository;
}

export interface ITransaction {
  run<T>(work: (context: ITransactionContext) => Promise<T>): Promise<T>;
}
