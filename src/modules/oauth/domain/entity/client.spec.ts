import { Client } from "@modules/oauth/domain/entity/client";
import { ClientAlreadyActiveException } from "@modules/oauth/domain/exception/client-already-active.exception";
import { ClientAlreadyInactiveException } from "@modules/oauth/domain/exception/client-already-inactive.exception";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { UserId } from "@modules/user/user.ids";

describe("Client", () => {
  const create = (location?: LocationHref) =>
    Client.create({ userId: UserId.create(), name: new ClientName("Test app"), secretHash: "secret-hash", location });

  it("creates an active client with an optional location", () => {
    expect(create().getIsActive()).toBe(true);
    expect(create().getLocation()).toBeNull();

    const location = new LocationHref("https://example.com/callback");
    expect(create(location).getLocation()).toBe(location);
  });

  it("deactivates and reactivates, rejecting repeated transitions", () => {
    const client = create();
    expect(() => client.activate()).toThrow(ClientAlreadyActiveException);
    client.deactivate();
    expect(client.getIsActive()).toBe(false);
    expect(() => client.deactivate()).toThrow(ClientAlreadyInactiveException);
    expect(client.getIsActive()).toBe(false);
    client.activate();
    expect(client.getIsActive()).toBe(true);
    expect(() => client.activate()).toThrow(ClientAlreadyActiveException);
  });

  it("updates name and location while preserving identity, owner and secret", () => {
    const client = create();
    const id = client.getId();
    const owner = client.getUserId();
    const createdAt = client.getCreatedAt();
    client.updateName(new ClientName("Renamed app"));

    const name = client.getName();
    client.updateName(new ClientName(" Renamed app "));
    expect(client.getName()).toBe(name);
    expect(name.getValue()).toBe("Renamed app");

    const location = new LocationHref("https://example.com/new-callback");
    client.updateLocation(location);
    expect(client.getLocation()).toBe(location);
    expect(client.getId()).toBe(id);
    expect(client.getUserId()).toBe(owner);
    expect(client.getSecretHash()).toBe("secret-hash");
    client.getCreatedAt().setFullYear(2000);
    expect(client.getCreatedAt()).toEqual(createdAt);
  });
});
