import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { makeClient } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ValidateClientRedirectQueryHandler } from "@modules/oauth/application/handler/validate-client-redirect.query.handler";
import { ValidateClientRedirectQuery } from "@modules/oauth/application/query/validate-client-redirect.query";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";

describe("ValidateClientRedirectQueryHandler", () => {
  const validate = mockFn<AuthorizationRequestValidator["validateRedirect"]>();

  afterEach(() => validate.mockReset());

  it("passes typed client ID, redirect URI to validation", async () => {
    const client = makeClient();
    const handler = await testHandler(ValidateClientRedirectQueryHandler, [
      { provide: AuthorizationRequestValidator, useValue: { validateRedirect: validate } },
    ]);
    await expect(
      handler.execute(new ValidateClientRedirectQuery(client.getId().getValue(), "https://app.example.com/callback"))
    ).resolves.toBeUndefined();
    expect(validate).toHaveBeenCalledWith(client.getId(), "https://app.example.com/callback");
  });

  it("propagates validation rejection", async () => {
    const client = makeClient();
    const error = new Error("invalid authorization");
    validate.mockRejectedValue(error);

    const handler = await testHandler(ValidateClientRedirectQueryHandler, [
      { provide: AuthorizationRequestValidator, useValue: { validateRedirect: validate } },
    ]);
    await expect(
      handler.execute(new ValidateClientRedirectQuery(client.getId().getValue(), "https://app.example.com/callback"))
    ).rejects.toBe(error);
  });
});
