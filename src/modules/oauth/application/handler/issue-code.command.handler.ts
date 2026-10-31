import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { IssueCodeCommand } from "@modules/oauth/application/command/issue-code.command";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";
import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { AuthorizationCodeIssuedEvent } from "@modules/oauth/domain/event/authorization-code-issued.event";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import { AUTHORIZATION_CODE_REPOSITORY, AUTHORIZATION_CODE_SERVICE } from "@modules/oauth/oauth.tokens";
import { UserId } from "@modules/user/user.ids";

export interface IssueCodeResult {
  code: string;
  expiresAt: Date;
}

const MILLISECONDS_PER_SECOND = 1000;

@CommandHandler(IssueCodeCommand)
@Injectable()
export class IssueCodeCommandHandler implements ICommandHandler<IssueCodeCommand> {
  constructor(
    private readonly authorizationRequestValidator: AuthorizationRequestValidator,
    @Inject(AUTHORIZATION_CODE_REPOSITORY)
    private readonly authorizationCodeRepository: IAuthorizationCodeRepository,
    @Inject(AUTHORIZATION_CODE_SERVICE)
    private readonly authorizationCodeService: IAuthorizationCodeService,
    private readonly configService: ConfigService,
    @Inject(EventBus)
    private readonly eventBus: EventBus
  ) {}

  async execute(command: IssueCodeCommand): Promise<IssueCodeResult> {
    const clientId = ClientId.from(command.clientId);
    const requesterUserId = UserId.from(command.requester.userId);

    const client = await this.authorizationRequestValidator.validate(clientId, command.redirectUri, command.scopes);
    const rawCode = this.authorizationCodeService.generate();
    const codeHash = this.authorizationCodeService.hash(rawCode);
    const ttlSeconds = this.configService.getOrThrow<number>("AUTHORIZATION_CODE_TTL");
    const expiresAt = new Date(Date.now() + ttlSeconds * MILLISECONDS_PER_SECOND);
    const authorizationCode = AuthorizationCode.create({
      clientId: client.getId(),
      userId: requesterUserId,
      codeHash,
      scopes: new CodeScopes(command.scopes),
      redirectUri: new RedirectUri(command.redirectUri),
      expiresAt,
    });
    await this.authorizationCodeRepository.save(authorizationCode);
    this.eventBus.publish(new AuthorizationCodeIssuedEvent(authorizationCode.getId(), client.getId(), requesterUserId));

    return { code: rawCode, expiresAt };
  }
}
