import type { Role } from "@modules/user/domain/entity/role";
import { UserRole } from "@modules/user/domain/entity/user-role";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { EmailAlreadyConfirmedException } from "@modules/user/domain/exception/email-already-confirmed.exception";
import { RoleAlreadyAssignedException } from "@modules/user/domain/exception/role-already-assigned.exception";
import { UserAlreadyBlockedException } from "@modules/user/domain/exception/user-already-blocked.exception";
import { UserAlreadyUnblockedException } from "@modules/user/domain/exception/user-already-unblocked.exception";
import type { Email } from "@modules/user/domain/value-object/email.value-object";
import type { Name } from "@modules/user/domain/value-object/name.value-object";
import type { Surname } from "@modules/user/domain/value-object/surname.value-object";
import { UserId } from "@modules/user/user.ids";

export const PASSWORD_HASH_MAX_LENGTH = 72;
export const DEFAULT_AVATAR_PATH = "/assets/default-avatar.svg";

export class User {
  constructor(
    private readonly id: UserId,
    private name: Name,
    private surname: Surname,
    private email: Email,
    private passwordHash: string | null,
    private isConfirmed: UserEmailConfirmedStatus,
    private isBlocked: UserBlockedStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private roles: UserRole[] = [],
    private readonly avatar: string = DEFAULT_AVATAR_PATH
  ) {}

  static create(params: { name: Name; surname: Surname; email: Email; passwordHash: string | null }): User {
    return new User(
      UserId.create(),
      params.name,
      params.surname,
      params.email,
      params.passwordHash,
      UserEmailConfirmedStatus.Unconfirmed,
      UserBlockedStatus.Active,
      new Date(),
      new Date(),
      []
    );
  }

  getId(): UserId {
    return this.id;
  }

  getName(): Name {
    return this.name;
  }

  getSurname(): Surname {
    return this.surname;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string | null {
    return this.passwordHash;
  }

  getAvatar(): string {
    return this.avatar;
  }

  changePassword(passwordHash: string): void {
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
  }

  getIsConfirmed(): UserEmailConfirmedStatus {
    return this.isConfirmed;
  }

  getIsBlocked(): UserBlockedStatus {
    return this.isBlocked;
  }

  getRoles(): UserRole[] {
    return [...this.roles];
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  updateProfile(params: { name?: Name; surname?: Surname; email?: Email }): void {
    let hasChanges = false;

    if (params.name && params.name.getValue() !== this.name.getValue()) {
      this.name = params.name;
      hasChanges = true;
    }

    if (params.surname && params.surname.getValue() !== this.surname.getValue()) {
      this.surname = params.surname;
      hasChanges = true;
    }

    if (params.email && params.email.getValue() !== this.email.getValue()) {
      this.email = params.email;
      this.isConfirmed = UserEmailConfirmedStatus.Unconfirmed;
      hasChanges = true;
    }

    if (hasChanges) {
      this.updatedAt = new Date();
    }
  }

  confirmEmail(): void {
    if (this.isConfirmed === UserEmailConfirmedStatus.Confirmed) {
      throw new EmailAlreadyConfirmedException();
    }

    this.isConfirmed = UserEmailConfirmedStatus.Confirmed;
    this.updatedAt = new Date();
  }

  block(): void {
    if (this.isBlocked === UserBlockedStatus.Inactive) {
      throw new UserAlreadyBlockedException();
    }

    this.isBlocked = UserBlockedStatus.Inactive;
    this.updatedAt = new Date();
  }

  unblock(): void {
    if (this.isBlocked === UserBlockedStatus.Active) {
      throw new UserAlreadyUnblockedException();
    }

    this.isBlocked = UserBlockedStatus.Active;
    this.updatedAt = new Date();
  }

  assignRole(role: Role): void {
    if (this.roles.some((userRole) => userRole.getRoleId().equals(role.getId()))) {
      throw new RoleAlreadyAssignedException();
    }

    this.roles.push(new UserRole(this.id, role.getId(), role.getName()));
    this.updatedAt = new Date();
  }
}
