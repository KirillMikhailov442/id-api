import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { CreateUserCommand } from "@modules/user/application/command/create-user.command";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { User } from "@modules/user/domain/entity/user";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { Password } from "@modules/user/domain/value-object/password.value-object";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";
import { PASSWORD_HASHER, TRANSACTION, USER_REPOSITORY } from "@modules/user/user.tokens";

export const DEFAULT_ROLE_NAME = RoleType.User;

@CommandHandler(CreateUserCommand)
@Injectable()
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TRANSACTION)
    private readonly transaction: ITransaction,
    @Inject(EventBus)
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const email = new Email(command.email);

    if (await this.userRepository.existsByEmail(email)) {
      throw new EmailAlreadyRegisteredException();
    }

    const name = new Name(command.name);
    const surname = new Surname(command.surname);
    const password = new Password(command.password);
    const passwordHash = await this.passwordHasher.hash(password.getValue());
    const user = User.create({
      name,
      surname,
      email,
      passwordHash,
    });

    const createdUser = await this.transaction.run(async (context) => {
      const role = await context.roleRepository.findByName(new RoleName(DEFAULT_ROLE_NAME));

      if (role === null) {
        throw new RoleNotFoundException(`Role "${DEFAULT_ROLE_NAME}" not found`);
      }

      user.assignRole(role);
      await context.userRepository.save(user);

      for (const userRole of user.getRoles()) {
        await context.userRoleRepository.save(userRole);
      }

      return user;
    });
    this.eventBus.publish(new UserCreatedEvent(createdUser.getId(), email, name, createdUser.getIsConfirmed()));

    return createdUser;
  }
}
