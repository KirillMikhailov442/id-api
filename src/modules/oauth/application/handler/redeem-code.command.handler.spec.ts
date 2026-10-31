import { EventBus } from "@nestjs/cqrs";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import { makeClient, makeCode } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { RedeemCodeCommandHandler } from "@modules/oauth/application/handler/redeem-code.command.handler";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import { OAuthTokenExchangeService } from "@modules/oauth/application/service/oauth-token-exchange.service";
import { AuthorizationCodeRedeemedEvent } from "@modules/oauth/domain/event/authorization-code-redeemed.event";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { AUTHORIZATION_CODE_REPOSITORY, AUTHORIZATION_CODE_SERVICE } from "@modules/oauth/oauth.tokens";

describe("RedeemCodeCommandHandler", () => {
  const redeem = mockFn<OAuthTokenExchangeService["redeem"]>();
  const findByCodeHash = mockFn<IAuthorizationCodeRepository["findByCodeHash"]>();
  const hash = mockFn<IAuthorizationCodeService["hash"]>();
  const publish = jest.fn();
  let handler: RedeemCodeCommandHandler;
  let client: ReturnType<typeof makeClient>;
  let code: ReturnType<typeof makeCode>;
  let command: RedeemCodeCommand;

  beforeEach(async () => {
    redeem.mockReset();
    findByCodeHash.mockReset();
    hash.mockReset();
    publish.mockReset();
    client = makeClient();
    code = makeCode(client);
    command = new RedeemCodeCommand(
      client.getId().getValue(),
      "client-secret",
      "raw-code",
      "https://app.example.com/callback"
    );
    redeem.mockResolvedValue({
      clientId: client.getId().getValue(),
      userId: client.getUserId().getValue(),
      scopes: ["profile"],
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 600,
    });
    hash.mockReturnValue(new CodeHash("a".repeat(64)));
    findByCodeHash.mockResolvedValue(code);
    handler = await testHandler(RedeemCodeCommandHandler, [
      { provide: OAuthTokenExchangeService, useValue: { redeem } },
      { provide: AUTHORIZATION_CODE_REPOSITORY, useValue: { findByCodeHash } },
      { provide: AUTHORIZATION_CODE_SERVICE, useValue: { hash } },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("returns exchanged tokens and publishes code redemption", async () => {
    const result = await handler.execute(command);
    expect(result.accessToken).toBe("access");
    expect(result.refreshToken).toBe("refresh");
    expect(result.expiresIn).toBe(600);
    expect(redeem).toHaveBeenCalledWith(command);
    expect(hash).toHaveBeenCalledWith("raw-code");
    expect(findByCodeHash).toHaveBeenCalledWith("a".repeat(64));
    expect(publish).toHaveBeenCalledWith(
      new AuthorizationCodeRedeemedEvent(code.getId(), client.getId(), client.getUserId())
    );
  });

  it("returns tokens without an event if the redeemed code is no longer in the repository", async () => {
    findByCodeHash.mockResolvedValue(null);
    await expect(handler.execute(command)).resolves.toMatchObject({ accessToken: "access" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not query or publish when the token exchange fails", async () => {
    const error = new Error("exchange rejected");
    redeem.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(findByCodeHash).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
