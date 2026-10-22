import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockUserCommandHandler } from "@core/application/handler/block-user.command.handler";
import { ConfirmEmailCommandHandler } from "@core/application/handler/confirm-email.command.handler";
import { CreateRoleCommandHandler } from "@core/application/handler/create-role.command.handler";
import { CreateUserCommandHandler } from "@core/application/handler/create-user.command.handler";
import { DeleteRoleCommandHandler } from "@core/application/handler/delete-role.command.handler";
import { DeleteUserCommandHandler } from "@core/application/handler/delete-user.command.handler";
import { GetRoleQueryHandler } from "@core/application/handler/get-role.query.handler";
import { GetUserQueryHandler } from "@core/application/handler/get-user.query.handler";
import { ListRolesQueryHandler } from "@core/application/handler/list-roles.query.handler";
import { ListUsersQueryHandler } from "@core/application/handler/list-users.query.handler";
import { UnblockUserCommandHandler } from "@core/application/handler/unblock-user.command.handler";
import { UpdateRoleCommandHandler } from "@core/application/handler/update-role.command.handler";
import { UpdateUserCommandHandler } from "@core/application/handler/update-user.command.handler";
import { UserBlockedEventHandler } from "@core/application/handler/user-blocked.event.handler";
import { UserCreatedEventHandler } from "@core/application/handler/user-created.event.handler";
import {
  EMAIL_CONFIRMATION_TOKEN_SERVICE,
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from "@core/core.tokens";
import { DbRole } from "@core/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@core/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@core/infrastructure/entity/db-user.entity";
import { MailService } from "@core/infrastructure/mail/mail.service";
import { DbRoleRepository } from "@core/infrastructure/repository/db-role.repository";
import { DbUserRoleRepository } from "@core/infrastructure/repository/db-user-role.repository";
import { DbUserRepository } from "@core/infrastructure/repository/db-user.repository";
import { BcryptPasswordHasher } from "@core/infrastructure/security/bcrypt-password-hasher";
import { JwtEmailConfirmationTokenService } from "@core/infrastructure/security/jwt-email-confirmation-token.service";
import { DbTransaction } from "@core/infrastructure/transaction/db-transaction";
import { RoleController } from "@core/presentation/controller/v1/role.controller";
import { UserController } from "@core/presentation/controller/v1/user.controller";

export {
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
  EMAIL_CONFIRMATION_TOKEN_SERVICE,
} from "@core/core.tokens";
export { UserNotFoundException } from "@core/domain/exception/user-not-found.exception";
export type { IRoleRepository } from "@core/application/port/role-repository";
export type { IPasswordHasher } from "@core/application/port/password-hasher";
export type { IUserRepository } from "@core/application/port/user-repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([DbUser, DbRole, DbUserRole]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("EMAIL_CONFIRM_SECRET"),
      }),
    }),
  ],
  controllers: [UserController, RoleController],
  providers: [
    DbUserRepository,
    DbRoleRepository,
    DbUserRoleRepository,
    BcryptPasswordHasher,
    DbTransaction,
    MailService,
    JwtEmailConfirmationTokenService,
    { provide: USER_REPOSITORY, useExisting: DbUserRepository },
    { provide: ROLE_REPOSITORY, useExisting: DbRoleRepository },
    { provide: USER_ROLE_REPOSITORY, useExisting: DbUserRoleRepository },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher },
    { provide: TRANSACTION, useExisting: DbTransaction },
    { provide: EMAIL_CONFIRMATION_TOKEN_SERVICE, useExisting: JwtEmailConfirmationTokenService },
    CreateUserCommandHandler,
    ConfirmEmailCommandHandler,
    UserBlockedEventHandler,
    UserCreatedEventHandler,
    UpdateUserCommandHandler,
    DeleteUserCommandHandler,
    BlockUserCommandHandler,
    UnblockUserCommandHandler,
    GetUserQueryHandler,
    ListUsersQueryHandler,
    CreateRoleCommandHandler,
    UpdateRoleCommandHandler,
    DeleteRoleCommandHandler,
    GetRoleQueryHandler,
    ListRolesQueryHandler,
  ],
  exports: [USER_REPOSITORY, ROLE_REPOSITORY, USER_ROLE_REPOSITORY, PASSWORD_HASHER, TRANSACTION],
})
export class CoreModule {}
