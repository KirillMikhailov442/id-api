import { ConfigService } from "@nestjs/config";
import { EventBus } from "@nestjs/cqrs";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { IssueCodeCommand } from "@modules/oauth/application/command/issue-code.command";
import { IssueCodeCommandHandler } from "@modules/oauth/application/handler/issue-code.command.handler";
import { makeClient, requester } from "@modules/oauth/application/handler/oauth-test.spec-support";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";
import { AuthorizationCodeIssuedEvent } from "@modules/oauth/domain/event/authorization-code-issued.event";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { AUTHORIZATION_CODE_REPOSITORY, AUTHORIZATION_CODE_SERVICE } from "@modules/oauth/oauth.tokens";
import { UserId } from "@modules/user/user.ids";

describe("IssueCodeCommandHandler", () => {
  const validate = mockFn<AuthorizationRequestValidator["validate"]>();
  const save = mockFn<IAuthorizationCodeRepository["save"]>();
  const generate = mockFn<IAuthorizationCodeService["generate"]>();
  const hash = mockFn<IAuthorizationCodeService["hash"]>();
  const publish = jest.fn();
  let handler: IssueCodeCommandHandler;
  let client: ReturnType<typeof makeClient>;
  let command: IssueCodeCommand;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    validate.mockReset();
    save.mockReset();
    generate.mockReset();
    hash.mockReset();
    publish.mockReset();
    client = makeClient();
    command = new IssueCodeCommand(requester, client.getId().getValue(), "https://app.example.com/callback", [
      "profile",
    ]);
    validate.mockResolvedValue(client);
    generate.mockReturnValue("raw-code");
    hash.mockReturnValue(new CodeHash("a".repeat(64)));
    handler = await testHandler(IssueCodeCommandHandler, [
      { provide: AuthorizationRequestValidator, useValue: { validate } },
      { provide: AUTHORIZATION_CODE_REPOSITORY, useValue: { save } },
      { provide: AUTHORIZATION_CODE_SERVICE, useValue: { generate, hash } },
      { provide: ConfigService, useValue: new ConfigService({ AUTHORIZATION_CODE_TTL: 60 }) },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("validates the request, stores only the code hash and returns the raw code with configured expiry", async () => {
    await expect(handler.execute(command)).resolves.toEqual({
      code: "raw-code",
      expiresAt: new Date("2026-10-01T00:01:00Z"),
    });
    expect(validate).toHaveBeenCalledWith(client.getId(), command.redirectUri, ["profile"]);
    expect(hash).toHaveBeenCalledWith("raw-code");
    expect(save).toHaveBeenCalledTimes(1);

    const code = save.mock.calls[0]?.[0];

    if (code === undefined) {
      throw new Error("Authorization code was not saved");
    }

    expect(code.getCodeHash()).toEqual(new CodeHash("a".repeat(64)));
    expect(code.getClientId()).toEqual(client.getId());
    expect(code.getUserId()).toEqual(UserId.from(requester.userId));
    expect(code.getScopes().getItems()).toEqual(["profile"]);
    expect(code.getRedirectUri().getValue()).toBe(command.redirectUri);
    expect(code.getExpiresAt()).toEqual(new Date("2026-10-01T00:01:00Z"));
    expect(publish).toHaveBeenCalledWith(
      new AuthorizationCodeIssuedEvent(code.getId(), client.getId(), UserId.from(requester.userId))
    );
  });

  it("does not generate or persist a code if validation fails", async () => {
    const error = new Error("invalid request");
    validate.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(generate).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish if saving fails", async () => {
    const error = new Error("save failed");
    save.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
  });
});
