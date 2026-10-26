import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";
import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { AuthorizationCodeRedeemedEvent } from "@modules/oauth/domain/event/authorization-code-redeemed.event";
import { AuthorizationCodeExpiredException } from "@modules/oauth/domain/exception/authorization-code-expired.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { InvalidAuthorizationCodeException } from "@modules/oauth/domain/exception/invalid-authorization-code.exception";
import { InvalidClientCredentialsException } from "@modules/oauth/domain/exception/invalid-client-credentials.exception";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import {
  AUTHORIZATION_CODE_REPOSITORY,
  AUTHORIZATION_CODE_SERVICE,
  CLIENT_REPOSITORY,
  ID_TOKEN_SERVICE,
} from "@modules/oauth/oauth.tokens";
import { PASSWORD_HASHER, type IPasswordHasher } from "@modules/user/user.module";

export interface RedeemCodeResult {
  clientId: string;
  userId: string;
  scopes: string[];
  idToken: string;
  expiresIn: number;
}

@CommandHandler(RedeemCodeCommand)
@Injectable()
export class RedeemCodeCommandHandler implements ICommandHandler<RedeemCodeCommand> {
  private readonly authorizationCodeRepository: IAuthorizationCodeRepository;
  private readonly authorizationCodeService: IAuthorizationCodeService;
  private readonly clientRepository: IClientRepository;
  private readonly idTokenService: IIdTokenService;
  private readonly passwordHasher: IPasswordHasher;
  private readonly configService: ConfigService;
  private readonly eventBus: EventBus;

  constructor(
    @Inject(AUTHORIZATION_CODE_REPOSITORY)
    authorizationCodeRepository: IAuthorizationCodeRepository,
    @Inject(AUTHORIZATION_CODE_SERVICE)
    authorizationCodeService: IAuthorizationCodeService,
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository,
    @Inject(ID_TOKEN_SERVICE)
    idTokenService: IIdTokenService,
    @Inject(PASSWORD_HASHER)
    passwordHasher: IPasswordHasher,
    @Inject(ConfigService)
    configService: ConfigService,
    @Inject(EventBus)
    eventBus: EventBus
  ) {
    this.authorizationCodeRepository = authorizationCodeRepository;
    this.authorizationCodeService = authorizationCodeService;
    this.clientRepository = clientRepository;
    this.idTokenService = idTokenService;
    this.passwordHasher = passwordHasher;
    this.configService = configService;
    this.eventBus = eventBus;
  }

  async execute(command: RedeemCodeCommand): Promise<RedeemCodeResult> {
    const codeHash = this.authorizationCodeService.hash(command.code);
    const authorizationCode = await this.authorizationCodeRepository.findByCodeHash(codeHash.getValue());

    if (authorizationCode === null || authorizationCode.getClientId() !== command.clientId) {
      throw new InvalidAuthorizationCodeException();
    }

    this.assertRedirectUri(authorizationCode, command.redirectUri);
    const client = await this.clientRepository.findById(authorizationCode.getClientId());

    if (client === null) {
      throw new InvalidAuthorizationCodeException();
    }

    if (!client.getIsActive()) {
      throw new ClientInactiveException();
    }

    const isSecretValid = await this.passwordHasher.compare(command.clientSecret, client.getSecretHash());

    if (!isSecretValid) {
      throw new InvalidClientCredentialsException();
    }

    if (authorizationCode.isExpired()) {
      throw new AuthorizationCodeExpiredException();
    }

    authorizationCode.markUsed();
    await this.authorizationCodeRepository.save(authorizationCode);
    this.eventBus.publish(
      new AuthorizationCodeRedeemedEvent(
        authorizationCode.getId(),
        authorizationCode.getClientId(),
        authorizationCode.getUserId()
      )
    );
    return this.toResult(authorizationCode);
  }

  private assertRedirectUri(authorizationCode: AuthorizationCode, redirectUri: string | undefined): void {
    if (redirectUri === undefined) {
      return;
    }

    const expectedRedirectUri = authorizationCode.getRedirectUri().getValue();

    if (new RedirectUri(redirectUri).getValue() !== expectedRedirectUri) {
      throw new InvalidAuthorizationCodeException();
    }
  }

  private async toResult(authorizationCode: AuthorizationCode): Promise<RedeemCodeResult> {
    const scopes = authorizationCode.getScopes().getItems();
    const idToken = await this.idTokenService.issueIdToken({
      userId: authorizationCode.getUserId(),
      clientId: authorizationCode.getClientId(),
      scopes,
    });
    const expiresIn = this.configService.getOrThrow<number>("ID_TOKEN_TTL");
    return {
      clientId: authorizationCode.getClientId(),
      userId: authorizationCode.getUserId(),
      scopes,
      idToken,
      expiresIn,
    };
  }
}
