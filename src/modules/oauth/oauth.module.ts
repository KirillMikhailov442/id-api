import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbTransactionRunner } from "@shared/infrastructure/transaction/db-transaction-runner";

import { AuthorizationRequestValidator } from "@modules/oauth/application/authorization-request-validator";
import { AssignScopesCommandHandler } from "@modules/oauth/application/handler/assign-scopes.command.handler";
import { CreateClientCommandHandler } from "@modules/oauth/application/handler/create-client.command.handler";
import { CreateScopeCommandHandler } from "@modules/oauth/application/handler/create-scope.command.handler";
import { DeleteClientCommandHandler } from "@modules/oauth/application/handler/delete-client.command.handler";
import { GetClientQueryHandler } from "@modules/oauth/application/handler/get-client.query.handler";
import { IssueCodeCommandHandler } from "@modules/oauth/application/handler/issue-code.command.handler";
import { ListAllClientsQueryHandler } from "@modules/oauth/application/handler/list-all-clients.query.handler";
import { ListClientScopesQueryHandler } from "@modules/oauth/application/handler/list-client-scopes.query.handler";
import { ListClientsQueryHandler } from "@modules/oauth/application/handler/list-clients.query.handler";
import { ListScopesQueryHandler } from "@modules/oauth/application/handler/list-scopes.query.handler";
import { RedeemCodeCommandHandler } from "@modules/oauth/application/handler/redeem-code.command.handler";
import { UnassignScopeCommandHandler } from "@modules/oauth/application/handler/unassign-scope.command.handler";
import { UpdateClientCommandHandler } from "@modules/oauth/application/handler/update-client.command.handler";
import { ValidateAuthorizationQueryHandler } from "@modules/oauth/application/handler/validate-authorization.query.handler";
import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { DbAuthorizationCodeRepository } from "@modules/oauth/infrastructure/repository/db-authorization-code.repository";
import { DbClientScopeRepository } from "@modules/oauth/infrastructure/repository/db-client-scope.repository";
import { DbClientRepository } from "@modules/oauth/infrastructure/repository/db-client.repository";
import { DbScopeRepository } from "@modules/oauth/infrastructure/repository/db-scope.repository";
import { CryptoAuthorizationCodeService } from "@modules/oauth/infrastructure/security/crypto-authorization-code-service";
import { JwtIdTokenService } from "@modules/oauth/infrastructure/security/jwt-id-token.service";
import { DbClientsTransaction } from "@modules/oauth/infrastructure/transaction/db-clients-transaction";
import {
  AUTHORIZATION_CODE_REPOSITORY,
  AUTHORIZATION_CODE_SERVICE,
  CLIENT_REPOSITORY,
  CLIENT_SCOPE_REPOSITORY,
  CLIENTS_TRANSACTION,
  ID_TOKEN_SERVICE,
  SCOPE_REPOSITORY,
} from "@modules/oauth/oauth.tokens";
import { ClientController } from "@modules/oauth/presentation/controller/v1/client.controller";
import { OAuthController } from "@modules/oauth/presentation/controller/v1/oauth.controller";
import { ScopeController } from "@modules/oauth/presentation/controller/v1/scope.controller";
import { UserModule } from "@modules/user/user.module";

export {
  CLIENT_REPOSITORY,
  CLIENT_SCOPE_REPOSITORY,
  SCOPE_REPOSITORY,
  AUTHORIZATION_CODE_REPOSITORY,
} from "@modules/oauth/oauth.tokens";

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([DbClient, DbScope, DbClientScope, DbAuthorizationCode]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
    }),
  ],
  controllers: [ClientController, ScopeController, OAuthController],
  providers: [
    DbClientRepository,
    DbClientScopeRepository,
    DbScopeRepository,
    DbAuthorizationCodeRepository,
    DbTransactionRunner,
    DbClientsTransaction,
    CryptoAuthorizationCodeService,
    JwtIdTokenService,
    AuthorizationRequestValidator,
    { provide: CLIENT_REPOSITORY, useExisting: DbClientRepository },
    { provide: CLIENT_SCOPE_REPOSITORY, useExisting: DbClientScopeRepository },
    { provide: SCOPE_REPOSITORY, useExisting: DbScopeRepository },
    { provide: CLIENTS_TRANSACTION, useExisting: DbClientsTransaction },
    { provide: AUTHORIZATION_CODE_REPOSITORY, useExisting: DbAuthorizationCodeRepository },
    { provide: AUTHORIZATION_CODE_SERVICE, useExisting: CryptoAuthorizationCodeService },
    { provide: ID_TOKEN_SERVICE, useExisting: JwtIdTokenService },
    CreateClientCommandHandler,
    UpdateClientCommandHandler,
    DeleteClientCommandHandler,
    AssignScopesCommandHandler,
    UnassignScopeCommandHandler,
    CreateScopeCommandHandler,
    IssueCodeCommandHandler,
    RedeemCodeCommandHandler,
    GetClientQueryHandler,
    ListClientsQueryHandler,
    ListAllClientsQueryHandler,
    ListClientScopesQueryHandler,
    ListScopesQueryHandler,
    ValidateAuthorizationQueryHandler,
  ],
  exports: [CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY, AUTHORIZATION_CODE_REPOSITORY],
})
export class OAuthModule {}
