import { randomUUID } from "node:crypto";

import type { Role } from "@core/domain/entity/role";
import { UserRole } from "@core/domain/entity/user-role";
import { UserBlockedStatus } from "@core/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@core/domain/enum/user-email-confirmed-status.enum";
import { EmailAlreadyConfirmedException } from "@core/domain/exception/email-already-confirmed.exception";
import { RoleAlreadyAssignedException } from "@core/domain/exception/role-already-assigned.exception";
import { UserAlreadyBlockedException } from "@core/domain/exception/user-already-blocked.exception";
import { UserAlreadyUnblockedException } from "@core/domain/exception/user-already-unblocked.exception";
import type { Email } from "@core/domain/value-object/email.value-object";
import type { Name } from "@core/domain/value-object/name.value-object";
import type { Surname } from "@core/domain/value-object/surname.value-object";

export class User {
  static create(params: { name: Name; surname: Surname; email: Email; passwordHash: string }): User {
    return new User(
      randomUUID(),
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

  constructor(
    private readonly id: string,
    private name: Name,
    private surname: Surname,
    private email: Email,
    private readonly passwordHash: string,
    private isConfirmed: UserEmailConfirmedStatus,
    private isBlocked: UserBlockedStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private roles: UserRole[] = []
  ) {}

  getId(): string {
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

  getPasswordHash(): string {
    return this.passwordHash;
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
    if (this.roles.some((userRole) => userRole.getRoleId() === role.getId())) {
      throw new RoleAlreadyAssignedException();
    }
    this.roles.push(new UserRole(this.id, role.getId()));
    this.updatedAt = new Date();
  }
}
