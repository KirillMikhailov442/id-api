import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { ClientId, ScopeId } from "@modules/oauth/oauth.ids";

describe("ClientScope", () => {
  it("preserves assignment data and protects its timestamp from getter mutations", () => {
    const date = new Date("2026-01-01");
    const entity = new ClientScope(ClientId.create(), ScopeId.create(), date);

    expect(entity.getClientId().getValue()).toMatch(/^[0-9a-f-]{36}$/);
    expect(entity.getScopeId().getValue()).toMatch(/^[0-9a-f-]{36}$/);
    expect(entity.getAssignedAt()).toEqual(date);
    entity.getAssignedAt().setFullYear(2000);
    expect(entity.getAssignedAt()).toEqual(date);
  });
});
