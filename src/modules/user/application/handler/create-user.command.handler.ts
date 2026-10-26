import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { CreateUserCommand } from "@modules/user/application/command/create-user.command";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { User } from "@modules/user/domain/entity/user";
import { UserRole } from "@modules/user/domain/entity/user-role";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";
import { PASSWORD_HASHER, TRANSACTION, USER_REPOSITORY } from "@modules/user/user.tokens";

export const DEFAULT_ROLE_NAME = RoleType.User;

@CommandHandler(CreateUserCommand)
@Injectable()
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {
  private readonly userRepository: IUserRepository;
  private readonly passwordHasher: IPasswordHasher;
  private readonly transaction: ITransaction;
  private readonly eventBus: EventBus;

  constructor(
    @Inject(USER_REPOSITORY)
    userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    passwordHasher: IPasswordHasher,
    @Inject(TRANSACTION)
    transaction: ITransaction,
    @Inject(EventBus)
    eventBus: EventBus
  ) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.transaction = transaction;
    this.eventBus = eventBus;
  }

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
