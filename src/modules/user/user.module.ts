import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockUserCommandHandler } from "@modules/user/application/handler/block-user.command.handler";
import { ConfirmEmailCommandHandler } from "@modules/user/application/handler/confirm-email.command.handler";
import { CreateRoleCommandHandler } from "@modules/user/application/handler/create-role.command.handler";
import { CreateUserCommandHandler } from "@modules/user/application/handler/create-user.command.handler";
import { DeleteRoleCommandHandler } from "@modules/user/application/handler/delete-role.command.handler";
import { DeleteUserCommandHandler } from "@modules/user/application/handler/delete-user.command.handler";
import { GetRoleQueryHandler } from "@modules/user/application/handler/get-role.query.handler";
import { GetUserQueryHandler } from "@modules/user/application/handler/get-user.query.handler";
import { ListRolesQueryHandler } from "@modules/user/application/handler/list-roles.query.handler";
import { ListUsersQueryHandler } from "@modules/user/application/handler/list-users.query.handler";
import { UnblockUserCommandHandler } from "@modules/user/application/handler/unblock-user.command.handler";
import { UpdateRoleCommandHandler } from "@modules/user/application/handler/update-role.command.handler";
import { UpdateUserCommandHandler } from "@modules/user/application/handler/update-user.command.handler";
import { UserBlockedEventHandler } from "@modules/user/application/handler/user-blocked.event.handler";
import { UserCreatedEventHandler } from "@modules/user/application/handler/user-created.event.handler";
import {
  EMAIL_CONFIRMATION_TOKEN_SERVICE,
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from "@modules/user/user.tokens";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { MailService } from "@modules/user/infrastructure/mail/mail.service";
import { DbRoleRepository } from "@modules/user/infrastructure/repository/db-role.repository";
import { DbUserRoleRepository } from "@modules/user/infrastructure/repository/db-user-role.repository";
import { DbUserRepository } from "@modules/user/infrastructure/repository/db-user.repository";
import { BcryptPasswordHasher } from "@modules/user/infrastructure/security/bcrypt-password-hasher";
import { JwtEmailConfirmationTokenService } from "@modules/user/infrastructure/security/jwt-email-confirmation-token.service";
import { DbTransaction } from "@modules/user/infrastructure/transaction/db-transaction";
import { RoleController } from "@modules/user/presentation/controller/v1/role.controller";
import { UserController } from "@modules/user/presentation/controller/v1/user.controller";

export {
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
  EMAIL_CONFIRMATION_TOKEN_SERVICE,
} from "@modules/user/user.tokens";
export { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
export type { IRoleRepository } from "@modules/user/application/port/role-repository";
export type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
export type { IUserRepository } from "@modules/user/application/port/user-repository";

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
export class UserModule {}
