import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockUserCommandHandler } from "@core/application/handler/block-user.command.handler";
import { CreateUserCommandHandler } from "@core/application/handler/create-user.command.handler";
import { DeleteUserCommandHandler } from "@core/application/handler/delete-user.command.handler";
import { GetUserQueryHandler } from "@core/application/handler/get-user.query.handler";
import { ListUsersQueryHandler } from "@core/application/handler/list-users.query.handler";
import { UpdateUserCommandHandler } from "@core/application/handler/update-user.command.handler";
import {
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from "@core/core.tokens";
import { DbRole } from "@core/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@core/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@core/infrastructure/entity/db-user.entity";
import { DbRoleRepository } from "@core/infrastructure/repository/db-role.repository";
import { DbUserRoleRepository } from "@core/infrastructure/repository/db-user-role.repository";
import { DbUserRepository } from "@core/infrastructure/repository/db-user.repository";
import { BcryptPasswordHasher } from "@core/infrastructure/security/bcrypt-password-hasher";
import { DbTransaction } from "@core/infrastructure/transaction/db-transaction";

export {
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  TRANSACTION,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from "@core/core.tokens";

@Module({
  imports: [TypeOrmModule.forFeature([DbUser, DbRole, DbUserRole])],
  providers: [
    DbUserRepository,
    DbRoleRepository,
    DbUserRoleRepository,
    BcryptPasswordHasher,
    DbTransaction,
    { provide: USER_REPOSITORY, useExisting: DbUserRepository },
    { provide: ROLE_REPOSITORY, useExisting: DbRoleRepository },
    { provide: USER_ROLE_REPOSITORY, useExisting: DbUserRoleRepository },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher },
    { provide: TRANSACTION, useExisting: DbTransaction },
    CreateUserCommandHandler,
    UpdateUserCommandHandler,
    DeleteUserCommandHandler,
    BlockUserCommandHandler,
    GetUserQueryHandler,
    ListUsersQueryHandler,
  ],
  exports: [USER_REPOSITORY, ROLE_REPOSITORY, USER_ROLE_REPOSITORY, PASSWORD_HASHER, TRANSACTION],
})
export class CoreModule {}
