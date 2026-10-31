<div align="center">
  <img src="./static/images/favicon.svg" alt="Mikh SSO API" width="120" height="120" />
  <h1>Mikh SSO API</h1>
</div>

## Entity identifiers

Domain entities and repository contracts use immutable, entity-specific UUID value
objects. Public ID factories and types live in `user.ids.ts`, `session.ids.ts`, and
`oauth.ids.ts`. For example, `UserId.create()` generates an ID and
`UserId.from(uuid)` restores one. Different entity ID types cannot be interchanged.
Use `equals()` for value equality and `getValue()` for persistence and transport.
UUIDs are validated and normalized to lowercase by the shared `EntityId<T>`.
HTTP payloads, JWT claims, database columns, and Redis keys retain their string
representation. This change does not require a database migration.

## Static files

Keep public HTML, CSS, JavaScript, images, fonts, and other static files in
`static/`. Organize them into subdirectories as needed, for example
`images/`, `css/`, and `js/`. A file at `static/index.html` is served at
`/static/index.html`; `static/images/default-avatar.svg` is served at
`/static/images/default-avatar.svg`. These URLs are independent of `API_GLOBAL_PREFIX`.

Nest copies the whole directory to `dist/static/` during builds and watches it
in development, including newly added files. Docker and the CI build artifact
include this directory as part of `dist/`. Static files are served unchanged;
JavaScript is not compiled or bundled. ESLint excludes this directory so that
vendored browser scripts can be stored alongside other public files.

The existing `/assets/default-avatar.svg` URL remains available as an alias for
the image in `static/images/`, preserving avatar paths already stored in the
database. Swagger's favicon is loaded from the same central directory.
Server-rendered email templates stay with their mail services and are not public
static files.

## Linting and formatting

Run `pnpm lint` to check JavaScript tooling and TypeScript source files, and
`pnpm lint:fix` to apply available fixes. Run `pnpm format` to format source files
and `pnpm format:check` to check formatting without changing files.

The ESLint flat config in `eslint.config.mjs` uses the JavaScript and TypeScript
recommended rules plus the non-React conventions from Taskflow: unused import
removal, underscore-prefixed unused variable allowances, type-only imports,
floating promise and strict boolean checks, statement spacing, and a 120-column
warning. Stylistic rules use `@stylistic/eslint-plugin`; Prettier handles formatting.
Class member ordering, grouped fields outside database entities and DTOs, and the ban on relative source imports
are also enforced. Database entity and DTO fields are separated by a blank line, with each
field decorator on its own line directly above the field. Plain data classes
with only fields and a constructor may use TypeScript parameter properties;
classes with methods, database entities, and DTOs keep explicit fields. Import restrictions keep modules independent of the composition
root, shared code independent of feature modules, configuration independent of
application code, and domain code independent of outer layers and framework packages.

Type-aware rules use the project TypeScript configuration. Decorator metadata
is preserved for NestJS dependency injection; `consistent-type-imports` follows
typescript-eslint's handling of files with legacy decorators and metadata enabled.

Additional checks reject misused promises, awaiting non-thenable values, missing
`await` in error-handling returns, incomplete enum/union switches, and unsafe
assignments, calls, property access, arguments, and returns involving `any`.
Unnecessary type assertions and non-null assertions are rejected as well.
Source files outside `src/config/` must use `ConfigService` instead of `process.env`.

## ID token signatures

When the granted scopes include `openid`, ID tokens contain the current user's
`name` (first name), `surname`, and `avatar` (absolute avatar
URL). Profile data is loaded when the authorization code is exchanged. Relative
avatar paths are resolved against `APP_BASE_URL`. An ID token is issued only when `openid` is granted. ID tokens are login assertions; API calls use the separate OAuth access token.

ID tokens use RS256 with a separate RSA private key configured through
`ID_TOKEN_PRIVATE_KEY`. Session access tokens continue to use `JWT_ACCESS_SECRET`.
Generate a persistent RSA key of at least 2048 bits, for example:

```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048
```

Store the PEM in your secret manager or ignored environment file. Both actual
newlines and escaped `\n` are supported:

```dotenv
ID_TOKEN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The key is required at startup. Use the same key across API replicas and restarts;
never generate a new key on each launch. Docker Compose reads it from the existing
`.env.development` configuration. Configure a separate secret for production.

`GET /api/v1/oauth/jwks` is public and returns `{ "keys": [...] }` containing only
the RSA public key in JWK format. The path follows `API_GLOBAL_PREFIX`. ID tokens
include `alg: RS256` and a `kid` derived from the public key. Clients should fetch
keys from this trusted endpoint, cache them, select the matching `kid`, and verify
the signature with RS256 explicitly allowed. Also validate `iss` against
`APP_BASE_URL`, `aud` against the application's client ID, and `exp`.

Existing ID tokens signed with the shared secret must be replaced through a new
login. This endpoint publishes the current public key only; replacing the private
key also replaces its public key and invalidates existing tokens for clients
without the old key cached. Overlapping key rotation is not implemented yet.

## SSO sessions and refresh token history

`sessions` represents a login, not a physical device: two browsers on one computer
can have separate sessions. `session_refresh_tokens` stores every issued refresh
token as a SHA-256 hash with `session_id`, creation/expiry timestamps, `used_at`
and `revoked_at`. Plaintext refresh tokens are returned to the browser only in the
existing HttpOnly cookie. A session is the refresh token family.

Login creates a session and its first refresh token in one transaction. Refresh
marks the presented token used and inserts a new token row in one PostgreSQL
transaction under the existing per-user advisory lock. The access token version
is derived from the total number of refresh token rows for the session. There is
no stored `sessions.version` column or separate database counter.
The session's refresh lifetime still slides on successful refresh.

Access JWTs contain `sid` and `ver`. Refresh invalidates previous SSO access
versions through `revoked-access:{sid}` in Redis. Logout, logout-all, remote
revocation and refresh token replay revoke the whole session and its refresh token
history. Other sessions remain active. The guard verifies the JWT, Redis boundary,
and the session's active state, owner and token count in PostgreSQL. Losing a
Redis record does not restore revoked or replaced access tokens. Redis unavailability
fails closed with HTTP 503.

Replay of a used refresh token commits session revocation before returning an
error. Redis revocations are written after database commit; a Redis error cannot
roll back revocation. A response failure after a successful rotation can require
a new login. Concurrent refresh requests count as replay: clients must coordinate
refresh across requests/tabs and must not blindly retry an old token. Detection
indicates possible theft or a client retry, not proof of a compromise. Requests
already authorized before revocation can finish.

Legacy Redis revocation keys remain recognized until they expire. Keep Redis
persistence and `noeviction` enabled; PostgreSQL remains the authoritative state.

## Delegated OAuth access

The authorization flow continues to use the existing consent page and assigned
client scopes. The migration adds these scope definitions but does not assign them
to any client automatically:

| Scope            | Permission                                                 |
| ---------------- | ---------------------------------------------------------- |
| `openid`         | Receive an ID token when exchanging the authorization code |
| `user:read`      | Read the consenting user's name, surname and avatar        |
| `user:write`     | Change only the consenting user's name and surname         |
| `offline_access` | Receive a rotating refresh token for offline access        |

Assign the required scopes to a client before requesting them. The consent UI must
explain them, including offline access, to the user. New permissions require a new
authorization request and user approval; refresh never expands scopes.

`POST /api/v1/clients` accepts an optional `scopes` array of existing scope names:

```json
{
  "name": "pet-dashboard",
  "secret": "s3cr3t-client-p@ss",
  "location": "https://pet-dashboard.example.com/auth/callback",
  "scopes": ["openid", "user:read"]
}
```

Omitting `scopes` or passing `[]` creates a client without scopes. Duplicate names
are assigned once. Unknown names return 404 and the client is not created.
Client creation and scope assignment are saved in one transaction.

Replacing a client's scopes or removing an individual scope permanently revokes
all grants for that client containing any removed scope, including their refresh
tokens. Access tokens for those grants are rejected on subsequent requests.
Grants containing only retained scopes keep working. Re-adding a scope does not
restore revoked grants; users must authorize again. Adding scopes never expands
existing grants. Scope changes and grant revocation commit in one transaction,
and serialize with authorization code exchanges and refresh requests for that
client. Requests already authorized before revocation can finish.

`POST /api/v1/oauth/token` accepts JSON or form fields. Existing camelCase fields
remain supported; standard aliases `grant_type`, `client_id`, `client_secret`,
`refresh_token` and `redirect_uri` are also accepted. For example:

```json
{
  "grant_type": "authorization_code",
  "client_id": "CLIENT_UUID",
  "client_secret": "CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "https://client.example.com/callback"
}
```

The response contains `access_token`, `token_type`, `expires_in` (access token
lifetime), `scope`, an `id_token` for `openid`, and a `refresh_token` for
`offline_access`. CamelCase response equivalents and `clientId`, `userId`,
`scopes` remain available for existing integrations. Token responses have
`Cache-Control: no-store` and `Pragma: no-cache`.

To refresh, send the same client credentials with `grant_type=refresh_token`
and `refresh_token`. The response replaces the refresh token and does not issue
a new ID token. Keep the new refresh token; the old one is single use.

`oauth_grants` binds one authorization to its user, client, scopes and API audience.
Each grant is one token family. `oauth_refresh_tokens` retains its hashed token
history. Authorization code consumption and initial token creation are atomic.
Refresh and revocation lock the grant, so a refresh cannot restore a revoked grant.
The OAuth grant has an absolute lifetime (`OAUTH_REFRESH_TTL`, default 30 days);
refresh does not extend it. A grant without refresh capability lasts only as long
as its access token.

OAuth access tokens use RS256 with the existing RSA key, a `kid`, `typ: at+jwt`,
and `sub`, `client_id`, `grant_id`, `scope`, `iss`, `aud`, `iat`, `exp`, `jti`.
Their audience is `OAUTH_AUDIENCE` (default `id-api`), not the application's client
ID used by ID tokens. Configure the same audience on every API replica.

| Route                                | Authentication                                           |
| ------------------------------------ | -------------------------------------------------------- |
| `GET /api/v1/users/me`               | SSO access token or OAuth access token with `user:read`  |
| `PATCH /api/v1/users/me`             | SSO access token or OAuth access token with `user:write` |
| `GET /api/v1/oauth/grants/me`        | Current user's internal SSO access token                 |
| `GET /api/v1/oauth/grants/:userId`   | Internal SSO access token with `ADMIN` role              |
| `DELETE /api/v1/oauth/grants/:id/me` | Owner's internal SSO access token                        |
| `DELETE /api/v1/oauth/grants/:id`    | Internal SSO access token with `ADMIN` role              |

Both grant lists accept `limit` (default 20, max 100) and `offset` (default 0),
and return `{ items, meta: { total, limit, offset } }`. Items include `id`,
`clientId`, `clientName`, `scopes`, `createdAt`, `expiresAt`, `revokedAt`, and
`status` (`active`, `expired`, `revoked`). Grant status describes its lifecycle;
user blocking and client restrictions are enforced separately by the OAuth guard.
All lifecycle states are listed, newest first, and multiple authorizations for the
same application appear separately. Lists expose no tokens, hashes or client
secrets. An administrator gets HTTP 404 for a nonexistent user. The delete route
ending in `/me` accepts only the owner's grant, including when the caller is an
administrator. The delete route without `/me` allows an administrator to revoke
any user's grant by its ID; ordinary users receive HTTP 403. Both routes revoke
the grant and its refresh tokens in PostgreSQL and block its access tokens through
Redis. The previous list paths (`GET /oauth/grants` and
`GET /users/:userId/oauth/grants`) have been replaced by the routes above.

Profile routes share one implementation. `GET /users/me` keeps the full account
response for SSO sessions; OAuth responses contain only `id`, `name`, `surname`
and `avatar`. `PATCH /users/me` accepts a partial update with at least one field:
SSO may change `name`, `surname`, `email`; OAuth may change only `name` and
`surname`. Attempts to send other OAuth fields (including email, roles, password,
or another user ID) are rejected, even if the global validation whitelist would
otherwise strip them. Both token types use the same profile update command.
The original `PUT /users/me` and separate `GET/PATCH /oauth/me` have been replaced
by these unified routes; clients must switch profile updates to PATCH.

OAuth domain exceptions use distinct uppercase codes, such as
`AUTHORIZATION_CODE_EXPIRED` and `INVALID_CLIENT_CREDENTIALS`. All JSON API errors,
including `POST /oauth/token`, use the common `{ status, code, message, ... }`
envelope with uppercase codes and their original HTTP statuses. Lowercase OAuth
error values are used only in the `error` query parameter when redirecting to the
client's `redirect_uri`, after the redirect URI has been validated.

`AppModule` registers `SessionAccessTokenGuard`, `OAuthAccessTokenGuard` and
`RolesGuard` globally, in that order after throttling. The session and roles guards
belong to the session module; the OAuth guard belongs to the OAuth module.
Authentication defaults to SSO-only. Use `@SessionAccessToken()` to declare this
explicitly, or `@OAuthAccessToken("user:read")` to require an OAuth token with all
listed scopes. The OAuth decorator requires at least one scope. Mixed routes combine
`@SessionAccessToken()` and `@OAuthAccessToken("user:read")`; decorator order does
not matter. Method-level authentication decorators replace controller-level
authentication settings; methods without them inherit the controller settings.
Missing scope requirements fail closed for OAuth. Roles can be satisfied only by
an SSO context; OAuth scopes never become internal account roles.

The shared `AccessTokenResolver` reads only the JOSE header to select the token type:
`JWT`/`HS256` selects `SessionAccessTokenGuard`; `at+jwt`/`RS256` selects
`OAuthAccessTokenGuard`. Header decoding grants no trust. The session guard calls
`SessionAuthenticationService.authenticate()`, which verifies the JWT through
`JwtAccessTokenService` and checks current session state/version in PostgreSQL
and revocation in Redis. The OAuth guard passes the required route scopes
to `OAuthAuthorizationService.authorize()`. Code redemption and refresh rotation
are handled by `OAuthTokenExchangeService`; owner/admin grant revocation is handled
by `OAuthGrantRevocationService`. JWT issuance and cryptographic verification remain
in `JwtOAuthAccessTokenService`. Unsupported headers and ID tokens are rejected,
and failed verification never retries another token type. OAuth verification checks issuer, audience,
Redis revocation, and current grant/user/client/scope state in PostgreSQL.
Verified callers are represented by a discriminated `AuthContext`. Existing
`CurrentUser` remains restricted to SSO contexts; mixed routes use `CurrentAuth`.
OAuth tokens cannot authenticate session, grant-management or admin routes.

OAuth refresh leaves earlier access tokens valid until expiry (default 15 minutes).
Grant revocation or refresh token replay blocks all of that grant's access tokens
immediately through `oauth:revoked:{grantId}` and the database state, including if
Redis records are later lost. Refresh tokens are bound to the authenticated client.

User notifications and a connected-applications UI are not implemented here.

## Migration and retention

Stop the old API during rollout, then run migrations before starting this version:

```sh
NODE_ENV=development pnpm migration:run
```

`InitSchema1792742368266` creates the complete current schema, including session
refresh token history, OAuth grants/refresh tokens, external provider identities and
nullable passwords for Google-only accounts. It seeds the `USER` and
`ADMIN` roles, the initial administrator, and the `openid`, `user:read`,
`user:write`, and `offline_access` scopes. No scopes are assigned to clients
automatically. Sessions have no stored version counter.

Migration history has been consolidated into this single initial migration.
Use it with a fresh database; it does not upgrade a database created by the
previous migration history. Rolling it back removes all application tables and data.

Configure the new settings from `.env.example`: `OAUTH_ACCESS_TTL`,
`OAUTH_REFRESH_TTL`, `OAUTH_AUDIENCE`, `TOKEN_HISTORY_RETENTION_DAYS`.
An hourly cleanup deletes at most 1,000 token rows per table per run, only for
families expired or revoked more than the retention period ago (default 30 days)
and whose access tokens have expired. All token history of a live family is kept,
even if an individual used token has expired, so replay detection keeps working.

## Google sign-in

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` in the environment.
Create a Web application OAuth client in Google Cloud and register the exact callback URL.
With the default API prefix, the local callback is
`http://localhost:8080/api/v1/auth/google/callback`.
Do not register the consumer application's callback as Google's callback.
Run `pnpm migration:run` before enabling sign-in.
The Google endpoints return 503 when credentials are not configured; password sign-in remains available.

The frontend button navigates the browser to `GET /api/v1/auth/google`.
The API creates a short-lived, browser-bound login attempt in Redis and redirects to Google
with state, nonce and a PKCE challenge. The callback consumes the attempt once,
exchanges the code and verifies Google's ID token using `google-auth-library`.
The provider identity is stored as `(provider, providerUserId)` in `user_identities`;
`IdentityProvider` currently contains `Google` and can be extended for other providers.

A first login creates a user, the normal user role and the provider identity atomically.
Subsequent logins reuse that user without overwriting the profile or roles.
Google-only users have no password and cannot use password login or change a password
through the existing old-password endpoint.
An existing email is never linked automatically: the callback returns 409
`EMAIL_ALREADY_REGISTERED`. An account-linking UI/endpoint is not included.
Denied, expired, replayed or invalid logins return 401. Blocked users cannot obtain a session.
For missing or incompatible Google profile names, the initial values are
`Пользователь` / `Не указана`; they can be edited through the existing profile API.
Gmail and verified Workspace email addresses are marked confirmed; third-party email
addresses follow the existing email-confirmation workflow.

On success the API sets the existing HttpOnly `refresh_token` cookie and redirects
straight to `APP_WEB_URL`. The home page should call `POST /api/v1/auth/refresh`
with `credentials: "include"` to obtain the SSO access token and load the current user.
No SSO or Google tokens are placed in the redirect URL, and Google tokens are not persisted.
The frontend and API must use the same site for the existing SameSite=Strict refresh cookie.
The temporary Google login cookie uses SameSite=Lax so it reaches the Google callback.
The configured `APP_WEB_URL` origin is permitted by the API's credentialed CORS policy.
This route returns to the SSO home page; a consumer application's pending authorization
request must be preserved by its SSO frontend if it needs to continue authorization afterward.

`EXTERNAL_LOGIN_TTL` controls attempt/cookie lifetime (seconds, default 600).
`EXTERNAL_LOGIN_HTTP_TIMEOUT` controls Google HTTP timeouts (milliseconds, default 10000).
Google identities are included in the consolidated initial migration. Rolling it back
removes all application tables and seed data.
