import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { CreateUserCommand } from "@core/application/command/create-user.command";
import type { IPasswordHasher } from "@core/application/port/password-hasher";
import type { ITransaction } from "@core/application/port/transaction.port";
import type { IUserRepository } from "@core/application/port/user-repository";
import { PASSWORD_HASHER, TRANSACTION, USER_REPOSITORY } from "@core/core.tokens";
import { User } from "@core/domain/entity/user";
import { UserRole } from "@core/domain/entity/user-role";
import { RoleType } from "@core/domain/enum/role-type.enum";
import { UserCreatedEvent } from "@core/domain/event/user-created.event";
import { EmailAlreadyRegisteredException } from "@core/domain/exception/email-already-registered.exception";
import { RoleNotFoundException } from "@core/domain/exception/role-not-found.exception";
import { Email } from "@core/domain/value-object/email.value-object";
import { Name } from "@core/domain/value-object/name.value-object";
import { RoleName } from "@core/domain/value-object/role-name.value-object";
import { Surname } from "@core/domain/value-object/surname.value-object";

export const DEFAULT_ROLE_NAME = RoleType.User;

@CommandHandler(CreateUserCommand)
@Injectable()
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TRANSACTION) private readonly transaction: ITransaction,
    @Inject(EventBus) private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const email = new Email(command.email);

    if (await this.userRepository.existsByEmail(email)) {
      throw new EmailAlreadyRegisteredException();
    }

    const name = new Name(command.name);
    const surname = new Surname(command.surname);
    const passwordHash = await this.passwordHasher.hash(command.password);

    const user = User.create({
      name,
      surname,
      email,
      passwordHash,
    });

    const createdUser = await this.transaction.run(async (context) => {
      await context.userRepository.save(user);

      const role = await context.roleRepository.findByName(new RoleName(DEFAULT_ROLE_NAME));

      if (role === null) {
        throw new RoleNotFoundException(`Role "${DEFAULT_ROLE_NAME}" not found`);
      }

      await context.userRoleRepository.save(new UserRole(user.getId(), role.getId(), new Date()));

      return user;
    });

    this.eventBus.publish(new UserCreatedEvent(createdUser.getId(), email.getValue(), name.getValue()));

    return createdUser;
  }
}
