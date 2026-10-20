import { User } from "@core/domain/entity/user";
import { Email } from "@core/domain/value-object/email.value-object";
import { Name } from "@core/domain/value-object/name.value-object";
import { Surname } from "@core/domain/value-object/surname.value-object";
import { DbUserRole } from "@core/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@core/infrastructure/entity/db-user.entity";
import { UserRoleMapper } from "@core/infrastructure/mapper/user-role.mapper";

export class UserMapper {
  static toDomain(dbUser: DbUser, dbUserRoles: DbUserRole[] = []): User {
    const roles = dbUserRoles.map(UserRoleMapper.toDomain);

    return new User(
      dbUser.id,
      new Name(dbUser.name),
      new Surname(dbUser.surname),
      new Email(dbUser.email),
      dbUser.passwordHash,
      dbUser.emailConfirmed,
      dbUser.blocked,
      dbUser.createdAt,
      dbUser.updatedAt,
      roles
    );
  }

  static toPersistence(user: User): { user: DbUser; userRoles: DbUserRole[] } {
    const dbUser = new DbUser();

    dbUser.id = user.getId();
    dbUser.name = user.getName().getValue();
    dbUser.surname = user.getSurname().getValue();
    dbUser.email = user.getEmail().getValue();
    dbUser.passwordHash = user.getPasswordHash();
    dbUser.emailConfirmed = user.getIsConfirmed();
    dbUser.blocked = user.getIsBlocked();
    dbUser.createdAt = user.getCreatedAt();
    dbUser.updatedAt = user.getUpdatedAt();

    const dbUserRoles = user.getRoles().map(UserRoleMapper.toPersistence);

    return { user: dbUser, userRoles: dbUserRoles };
  }
}
