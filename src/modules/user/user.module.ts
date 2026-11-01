import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailService } from "@shared/mail/mail.service";
import { DbTransactionRunner } from "@shared/transaction/db-transaction-runner";

import { DeviceInfoModule } from "@modules/session/device-info.module";
import { BlockUserCommandHandler } from "@modules/user/application/handler/block-user.command.handler";
import { ChangePasswordCommandHandler } from "@modules/user/application/handler/change-password.command.handler";
import { ConfirmEmailCommandHandler } from "@modules/user/application/handler/confirm-email.command.handler";
import { CreateRoleCommandHandler } from "@modules/user/application/handler/create-role.command.handler";
import { CreateUserCommandHandler } from "@modules/user/application/handler/create-user.command.handler";
import { DeleteRoleCommandHandler } from "@modules/user/application/handler/delete-role.command.handler";
import { DeleteUserCommandHandler } from "@modules/user/application/handler/delete-user.command.handler";
import { GetCurrentUserQueryHandler } from "@modules/user/application/handler/get-current-user.query.handler";
import { GetRoleQueryHandler } from "@modules/user/application/handler/get-role.query.handler";
import { GetUserQueryHandler } from "@modules/user/application/handler/get-user.query.handler";
import { ListRolesQueryHandler } from "@modules/user/application/handler/list-roles.query.handler";
import { ListUsersQueryHandler } from "@modules/user/application/handler/list-users.query.handler";
import { ResolveExternalUserCommandHandler } from "@modules/user/application/handler/resolve-external-user.command.handler";
import { UnblockUserCommandHandler } from "@modules/user/application/handler/unblock-user.command.handler";
import { UpdateRoleCommandHandler } from "@modules/user/application/handler/update-role.command.handler";
import { UpdateUserCommandHandler } from "@modules/user/application/handler/update-user.command.handler";
import { UserBlockedEventHandler } from "@modules/user/application/handler/user-blocked.event.handler";
import { UserCreatedEventHandler } from "@modules/user/application/handler/user-created.event.handler";
import { ProfileAccessPolicy } from "@modules/user/application/profile-access.policy";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserIdentity } from "@modules/user/infrastructure/entity/db-user-identity.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";
import { DbRoleRepository } from "@modules/user/infrastructure/repository/db-role.repository";
import { DbUserRoleRepository } from "@modules/user/infrastructure/repository/db-user-role.repository";
import { DbUserRepository } from "@modules/user/infrastructure/repository/db-user.repository";
import { BcryptPasswordHasher } from "@modules/user/infrastructure/security/bcrypt-password-hasher";
import { JwtEmailConfirmationTokenService } from "@modules/user/infrastructure/security/jwt-email-confirmation-token.service";
import { DbTransaction } from "@modules/user/infrastructure/transaction/db-transaction";
import { RoleController } from "@modules/user/presentation/controller/v1/role.controller";
import { UserController } from "@modules/user/presentation/controller/v1/user.controller";
import {
  EMAIL_CONFIRMATION_TOKEN_SERVICE,
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from "@modules/user/user.tokens";

export {
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
  EMAIL_CONFIRMATION_TOKEN_SERVICE,
} from "@modules/user/user.tokens";

export { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";

export { RoleType } from "@modules/user/domain/enum/role-type.enum";

export type { IRoleRepository } from "@modules/user/application/port/role-repository";

export type { IPasswordHasher } from "@modules/user/application/port/password-hasher";

export type { IUserRepository } from "@modules/user/application/port/user-repository";

@Module({
  imports: [
    DeviceInfoModule,
    TypeOrmModule.forFeature([DbUser, DbRole, DbUserRole, DbUserIdentity]),
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
    DbTransactionRunner,
    DbTransaction,
    MailService,
    UserMailService,
    JwtEmailConfirmationTokenService,
    { provide: USER_REPOSITORY, useExisting: DbUserRepository },
    { provide: ROLE_REPOSITORY, useExisting: DbRoleRepository },
    { provide: USER_ROLE_REPOSITORY, useExisting: DbUserRoleRepository },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher },
    { provide: TRANSACTION, useExisting: DbTransaction },
    { provide: EMAIL_CONFIRMATION_TOKEN_SERVICE, useExisting: JwtEmailConfirmationTokenService },
    CreateUserCommandHandler,
    ResolveExternalUserCommandHandler,
    ChangePasswordCommandHandler,
    ConfirmEmailCommandHandler,
    UserBlockedEventHandler,
    UserCreatedEventHandler,
    UpdateUserCommandHandler,
    ProfileAccessPolicy,
    DeleteUserCommandHandler,
    BlockUserCommandHandler,
    UnblockUserCommandHandler,
    GetUserQueryHandler,
    GetCurrentUserQueryHandler,
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

export { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
export {
  ResolveExternalUserCommand,
  type ResolveExternalUserResult,
} from "@modules/user/application/command/resolve-external-user.command";
export { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
export { Email } from "@modules/user/domain/value-object/email.value-object";

export type { User } from "@modules/user/domain/entity/user";
