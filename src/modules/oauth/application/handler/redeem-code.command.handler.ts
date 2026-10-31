import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import type { OAuthTokenResult } from "@modules/oauth/application/port/oauth-token-result.type";
import { OAuthTokenExchangeService } from "@modules/oauth/application/service/oauth-token-exchange.service";
import { AuthorizationCodeRedeemedEvent } from "@modules/oauth/domain/event/authorization-code-redeemed.event";
import { ClientId } from "@modules/oauth/oauth.ids";
import { AUTHORIZATION_CODE_REPOSITORY, AUTHORIZATION_CODE_SERVICE } from "@modules/oauth/oauth.tokens";
import { UserId } from "@modules/user/user.ids";

export type RedeemCodeResult = OAuthTokenResult;
@CommandHandler(RedeemCodeCommand)
@Injectable()
export class RedeemCodeCommandHandler implements ICommandHandler<RedeemCodeCommand> {
  constructor(
    @Inject(OAuthTokenExchangeService)
    private readonly tokens: OAuthTokenExchangeService,
    @Inject(AUTHORIZATION_CODE_REPOSITORY)
    private readonly codes: IAuthorizationCodeRepository,
    @Inject(AUTHORIZATION_CODE_SERVICE)
    private readonly codeService: IAuthorizationCodeService,
    @Inject(EventBus)
    private readonly events: EventBus
  ) {}

  async execute(command: RedeemCodeCommand): Promise<RedeemCodeResult> {
    const result = await this.tokens.redeem(command);
    const code = await this.codes.findByCodeHash(this.codeService.hash(command.code).getValue());

    if (code !== null)
      this.events.publish(
        new AuthorizationCodeRedeemedEvent(code.getId(), ClientId.from(result.clientId), UserId.from(result.userId))
      );

    return result;
  }
}
