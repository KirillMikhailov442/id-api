import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { GetJwksQueryHandler } from "@modules/oauth/application/handler/get-jwks.query.handler";
import type { IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";
import { GetJwksQuery } from "@modules/oauth/application/query/get-jwks.query";
import { ID_TOKEN_SERVICE } from "@modules/oauth/oauth.tokens";

describe("GetJwksQueryHandler", () => {
  it.each([false, true])("returns the published key set (empty=%s)", async (empty) => {
    const getPublicKeys = mockFn<IIdTokenService["getPublicKeys"]>();
    const keys: ReturnType<IIdTokenService["getPublicKeys"]> = empty
      ? []
      : [{ kty: "RSA", use: "sig", alg: "RS256", kid: "key-1", n: "modulus", e: "AQAB" }];
    getPublicKeys.mockReturnValue(keys);

    const handler = await testHandler(GetJwksQueryHandler, [
      { provide: ID_TOKEN_SERVICE, useValue: { getPublicKeys } },
    ]);
    await expect(handler.execute(new GetJwksQuery())).resolves.toBe(keys);
    expect(getPublicKeys).toHaveBeenCalledTimes(1);
  });
});
