import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { AuthorizationRequestValidator } from "@modules/oauth/application/authorization-request-validator";
import { IssueCodeCommand } from "@modules/oauth/application/command/issue-code.command";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { AuthorizationCodeIssuedEvent } from "@modules/oauth/domain/event/authorization-code-issued.event";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { AUTHORIZATION_CODE_REPOSITORY, AUTHORIZATION_CODE_SERVICE } from "@modules/oauth/oauth.tokens";

export interface IssueCodeResult {
  code: string;
  expiresAt: Date;
}

const MILLISECONDS_PER_SECOND = 1000;

@CommandHandler(IssueCodeCommand)
@Injectable()
export class IssueCodeCommandHandler implements ICommandHandler<IssueCodeCommand> {
  private readonly authorizationRequestValidator: AuthorizationRequestValidator;
  private readonly authorizationCodeRepository: IAuthorizationCodeRepository;
  private readonly authorizationCodeService: IAuthorizationCodeService;
  private readonly configService: ConfigService;
  private readonly eventBus: EventBus;

  constructor(
    authorizationRequestValidator: AuthorizationRequestValidator,
    @Inject(AUTHORIZATION_CODE_REPOSITORY)
    authorizationCodeRepository: IAuthorizationCodeRepository,
    @Inject(AUTHORIZATION_CODE_SERVICE)
    authorizationCodeService: IAuthorizationCodeService,
    configService: ConfigService,
    @Inject(EventBus)
    eventBus: EventBus
  ) {
    this.authorizationRequestValidator = authorizationRequestValidator;
    this.authorizationCodeRepository = authorizationCodeRepository;
    this.authorizationCodeService = authorizationCodeService;
    this.configService = configService;
    this.eventBus = eventBus;
  }

  async execute(command: IssueCodeCommand): Promise<IssueCodeResult> {
    const client = await this.authorizationRequestValidator.validate(
      command.clientId,
      command.redirectUri,
      command.scopes
    );
    const rawCode = this.authorizationCodeService.generate();
    const codeHash = this.authorizationCodeService.hash(rawCode);
    const ttlSeconds = this.configService.getOrThrow<number>("AUTHORIZATION_CODE_TTL");
    const expiresAt = new Date(Date.now() + ttlSeconds * MILLISECONDS_PER_SECOND);
    const authorizationCode = AuthorizationCode.create({
      clientId: client.getId(),
      userId: command.requester.userId,
      codeHash,
      scopes: new CodeScopes(command.scopes),
      redirectUri: new RedirectUri(command.redirectUri),
      expiresAt,
    });
    await this.authorizationCodeRepository.save(authorizationCode);
    this.eventBus.publish(
      new AuthorizationCodeIssuedEvent(authorizationCode.getId(), client.getId(), command.requester.userId)
    );
    return { code: rawCode, expiresAt };
  }
}
