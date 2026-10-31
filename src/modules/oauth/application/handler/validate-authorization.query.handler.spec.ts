import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { makeClient } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ValidateAuthorizationQueryHandler } from "@modules/oauth/application/handler/validate-authorization.query.handler";
import { ValidateAuthorizationQuery } from "@modules/oauth/application/query/validate-authorization.query";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";

describe("ValidateAuthorizationQueryHandler", () => {
  const validate = mockFn<AuthorizationRequestValidator["validate"]>();

  afterEach(() => validate.mockReset());

  it("passes typed client ID, redirect URI and scopes to validation", async () => {
    const client = makeClient();
    validate.mockResolvedValue(client);

    const handler = await testHandler(ValidateAuthorizationQueryHandler, [
      { provide: AuthorizationRequestValidator, useValue: { validate: validate } },
    ]);
    await expect(
      handler.execute(
        new ValidateAuthorizationQuery(client.getId().getValue(), "https://app.example.com/callback", ["profile"])
      )
    ).resolves.toBeUndefined();
    expect(validate).toHaveBeenCalledWith(client.getId(), "https://app.example.com/callback", ["profile"]);
  });

  it("propagates validation rejection", async () => {
    const client = makeClient();
    const error = new Error("invalid authorization");
    validate.mockRejectedValue(error);

    const handler = await testHandler(ValidateAuthorizationQueryHandler, [
      { provide: AuthorizationRequestValidator, useValue: { validate: validate } },
    ]);
    await expect(
      handler.execute(
        new ValidateAuthorizationQuery(client.getId().getValue(), "https://app.example.com/callback", ["profile"])
      )
    ).rejects.toBe(error);
  });
});
