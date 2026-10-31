# AGENT.md — Instructions for AI Agents

This file contains mandatory rules for AI agents working on this repository. Follow them strictly. Do not invent new conventions — reuse the existing ones.

## 1. Project Overview

**id-api** is an SSO (Single Sign-On) service for all pet projects. Its responsibilities:

- **Centralized registration and authentication** of users for all consumer projects.
- **Centralized account management** — e.g. updating user information from any consumer project.

### Tech Stack

| Concern | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | NestJS |
| Architecture | DDD (Domain-Driven Design) + CQRS |
| Async messaging | Event Bus (`@nestjs/cqrs` EventBus) |
| Database | PostgreSQL |
| ORM | TypeORM |
| Linting | ESLint |
| Formatting | prettier |
| Testing | jest |

## 2. Directory Architecture

Application code lives in `src/` under `shared/`, `modules/`, and `config/`. Database migrations live in `src/migrations/`. Public static files live in root-level `static/` next to `src/`. **Do not add other top-level directories.**

```
src/
├── shared/                        # Public reusable code grouped by purpose, without DDD layers
│   ├── auth/                      # decorator/, contract/, cookie/
│   ├── exception/                 # base/, filter/, factory/, response/, swagger/
│   ├── http/                      # HTTP status codes
│   ├── pagination/                # Pagination queries, responses and Swagger decorator
│   ├── query/                     # Search and sort query contracts
│   ├── mail/                      # Mail service, template renderer and templates/
│   ├── transaction/               # Transaction contracts and database runner
│   ├── security/                  # Shared token services
│   ├── scheduled-tasks/           # Periodic background tasks, including token history cleanup
│   ├── repository/                # Base repository contract
│   └── value-object/              # Base value object contract
├── modules/                       # Feature aggregates (user, session, oauth, ...)
│   └── <aggregate-name>/
│       ├── domain/                # Aggregate roots, value objects, domain events, domain interfaces
│       ├── infrastructure/        # Repositories, TypeORM entities, external service adapters
│       ├── presentation/          # Controllers, DTOs
│       ├── application/           # Command/Query handlers, event handlers (when the aggregate needs CQRS plumbing)
│       └── <aggregate>.module.ts  # NestJS module + tokens at the root of the aggregate folder
├── config/                        # App configuration: DB connection, logger, env loading & validation
└── migrations/                    # Database migrations
```

### What goes where

| Artifact                                                                                        | Location                                     |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Aggregate roots, entities (domain), value objects                                               | `<aggregate>/domain/`                        |
| Domain events                                                                                   | `<aggregate>/domain/` (events subfolder)     |
| Domain repository interfaces (ports)                                                            | `<aggregate>/application/port/`              |
| Base domain contracts (`IValueObject`, `IRepository`)                                           | `shared/value-object/`, `shared/repository/` |
| Shared query contracts (pagination, sort, search)                                               | `shared/pagination/`, `shared/query/`        |
| Shared response envelopes (pagination meta + response)                                          | `shared/pagination/`                         |
| Shared exception handling: `ExceptionFilter`, `validationExceptionFactory`, exception responses | `shared/exception/`                          |
| Generic infrastructure (`MailService`, `TemplateRenderer`, `DbTransactionRunner`)               | `shared/mail/`, `shared/transaction/`        |
| Command / Query handlers                                                                        | `<aggregate>/application/`                   |
| Event handlers (EventBus subscribers)                                                           | `<aggregate>/application/`                   |
| TypeORM entities, repository implementations                                                    | `<aggregate>/infrastructure/`                |
| Controllers, guards, pipes                                                                      | `<aggregate>/presentation/`                  |
| Request / Query / Response / Dto classes                                                        | `<aggregate>/presentation/` (DTO subfolder)  |
| Module wiring (NestJS `@Module`)                                                                | root of the aggregate folder                 |
| DB connection, env validation, logger setup                                                     | `config/`                                    |

### Entity identifiers

- Use the immutable `EntityId<T>` value object from `shared/value-object/entity-id.value-object.ts` for internal UUID identifiers in domain entities, domain events, application commands/queries, and repository contracts.
- Public, framework-independent `<aggregate>.ids.ts` files expose distinct ID types and factories: `UserId`, `RoleId`, `SessionId`, `ClientId`, `ScopeId`, `AuthorizationCodeId`, `OAuthGrantId`, and refresh-token identifiers. Import these public contracts across aggregates rather than importing another aggregate's internals.
- Create new IDs with the appropriate factory's `create()` method and restore UUID strings with `from(value)`. Validation and UUID generation belong to the shared implementation. Do not cast strings to ID types or accept a different entity's ID.
- Compare IDs with `equals()`. Use `getValue()` as the key when deduplicating or looking up IDs in a `Set` or `Map`; object identity is not entity identity.
- HTTP DTOs, JWT claims, TypeORM entity columns, Redis keys, and SQL parameters use UUID strings. Convert explicitly at the relevant controller, mapper, token, and persistence boundary using `from()` and `getValue()`; never serialize the ID object into these formats.
- Composite links such as `UserRole` and `ClientScope` retain their pair of typed identifiers without adding a synthetic ID. External provider IDs and opaque tokens remain strings.

### Static files

- Store all public static files in `static/`; place it next to `src/`. Do not create asset folders under `config/`, feature modules, or elsewhere in `src/`.
- Group files by purpose when useful, e.g. `static/images/`, `static/css/`, and `static/js/`. Images, including the Swagger favicon and default avatar, live in `static/images/`.
- `config/static.ts` configures serving at `/static/`, independently of the API prefix. Nest copies the entire directory to `dist/static/` and watches new and changed files in development. Serve these files unchanged; do not put application TypeScript source in this directory.
- Preserve the `/assets/` compatibility route for avatar URLs already stored in the database; it serves images from `static/images/` without keeping a separate assets directory.
- Server-side mail templates stay beside the mail services and are not publicly served.

### Session device information

- Device information belongs to `modules/session/domain/`: `DeviceInfo`, value objects and name enums.
- The parser lives in `modules/session/infrastructure/device/`. Other modules use the public `modules/session/device-info.module.ts` exports.
- Name enums and their exported `ReadonlySet<string>` constants are snapshots of `node-device-detector` 2.2.7 dictionaries. Regenerate with `node scripts/generate-device-enums.cjs` after library updates, then format and review the changes.
- Value object constructors reject unknown names; parsing unknown names yields `null`. Persist original device types; legacy `mobile` values are read as `smartphone`.

### shared vs modules

- `shared/` groups reusable code by purpose, without `domain/`, `application/`, `infrastructure/` or `presentation/` layers. It is the **public shared kernel**: every module may import from it (`@shared/*`). It owns only contracts and generic infrastructure — no aggregate-specific logic.
- `modules/` holds **feature aggregates**. Each aggregate mirrors the same DDD folder structure. The **User aggregate** (`modules/user`) is the central domain of the SSO.
- Aggregates must not reach into another aggregate's internals — use its public module exports (`<aggregate>.module.ts`, `<aggregate>.tokens.ts`), public interfaces or domain events.
- Per-module Swagger decorators (`exception-response.decorator.ts`) live in each aggregate's `presentation/` and build on `shared/exception/swagger/` helpers (`responseExample`, `ApiValidationFailedResponse`).

## 3. Dependency Rules

Dependencies always point **toward the domain**:

```
presentation ──▶ domain ◀── infrastructure
```

- `domain/` must not import from `infrastructure/`, `presentation/`, or any framework package. The domain is pure TypeScript. This also applies to imports from `shared/`: only framework-independent contracts and domain primitives are allowed; HTTP adapters, decorators, filters and infrastructure implementations are forbidden.
- `infrastructure/` implements interfaces declared in `domain/` (repository interfaces, ports).
- `presentation/` depends on `application/` (commands/queries) — controllers never touch repositories or the database directly.
- Modules communicate cross-aggregate **only** via public contracts or domain events on the Event Bus — never by importing another aggregate's internal files.
- `config/` is imported by everything; `config/` imports nothing from `shared/`, or `modules/`.

## 4. Imports — Aliases Only

All relative imports are **forbidden anywhere in `src/`** — including imports from the same folder (`./foo`), parent folders (`../foo`), and any other traversal. Every import of project code must go through an alias:

```ts
// ❌ FORBIDDEN — any relative import, even to a neighboring file
import { AppModule } from './app.module';
import { User } from '../../domain/user.aggregate';
import { FieldError } from '../field-error';

// ✅ CORRECT — aliases only
import { AppModule } from '@app/app.module';
import { User } from '@modules/user/domain/entity/user';
import { FieldError } from '@shared/exception/response/field-error';
```

Available aliases:

| Alias | Points to |
|---|---|
| `@app/*` | `src/*` (root composition: `main.ts`, `app.module.ts`) |
| `@shared/*` | `src/shared/*` |
| `@modules/*` | `src/modules/*` |
| `@config/*` | `src/config/*` |

Never add new alias styles. If an alias is missing in `tsconfig.json` paths, flag it instead of falling back to relative imports.

Runtime note: `tsc` does not rewrite aliases in emitted JS, so `tsc-alias` must run after every compile (`nest build && tsc-alias -p tsconfig.build.json`, and `tsc-alias --watch` alongside `nest start --watch`). Do not remove it from the build scripts.

## 5. Configuration — ConfigService Only

All environment values are accessed **exclusively** through `ConfigService`:

```ts
// ❌ FORBIDDEN anywhere outside config/
process.env.DATABASE_URL;

// ✅ CORRECT
constructor(private readonly configService: ConfigService) {}

const dbPort = this.configService.get<number>('DB_PORT');
```

Rules:

- `process.env` may only be read inside `src/config/` (env loading and validation).
- New variables must be registered in `config/` (env schema/validation) before use.
- Never hardcode secrets, URLs, ports, or timeouts — they belong in env, read via `ConfigService`.

## 6. CQRS & Event Bus Conventions

The project uses `@nestjs/cqrs`. Every state-changing operation is a **Command**, every read is a **Query**, and meaningful domain facts are published as **Events**.

### Naming

| Kind | Suffix | Example |
|---|---|---|
| Command (write intent) | `Command` | `CreateUserCommand`, `UpdateAccountCommand` |
| Command handler | `Handler` | `CreateUserCommandHandler` — file `create-user-command.handler.ts` |
| Query (read intent) | `Query` | `GetUserQuery`, `ListSessionsQuery` |
| Query handler | `Handler` | `GetUserQueryHandler` |
| Domain event | `Event` | `UserCreatedEvent`, `UserEmailChangedEvent` |
| Event handler | `Handler` | `UserCreatedEventHandler` |

### Rules

- Command handlers own **transactions**: load the aggregate via a repository, mutate it, persist, publish events.
- Queries read directly via repositories/read models and must **not** mutate state.
- Cross-aggregate workflows are integrated through the **EventBus** (`userCreated$`, `eventBus.publish(...)`), not by calling other aggregates' services directly.
- Handlers are the only place where domain logic is orchestrated. Controllers only map HTTP to commands/queries.

## 7. TypeORM / PostgreSQL Conventions

- TypeORM entities live in `infrastructure/` and are **infrastructure details** — the domain must never import them.
- Every aggregate gets its repository interfaces (ports) in `application/port/`; its TypeORM implementation lives in `infrastructure/`.
- Data access happens **only** through repositories. Raw queries outside repositories are forbidden.
- Migrations are the only way to change the schema. Never edit an existing migration; always add a new one.
- Prefer explicit transactions in command handlers when multiple writes must be atomic.

## 8. API Contract Naming (DTO Rules)

Naming is determined by **how data travels**, not by personal preference:

| Contract | Suffix | When | Example |
|---|---|---|---|
| GET request / anything passed via URL query params | `Query` | HTTP GET, filters, pagination | `ListUsersQuery`, `GetUserQuery` |
| Request with a body (POST / PUT / PATCH) | `Request` | `CreateUserRequest`, `UpdateAccountRequest` | body DTOs |
| Anything returned from an endpoint | `Response` | used **only** when the payload contains extra data besides the entity (metadata, pagination, tokens) | `ListUsersResponse`, `CreateUserResponse` |
| Entities returned to the client | `Dto` | single-entity responses (returned directly) and entities nested inside a `Response` | `UserDto`, `AccountDto` |

Example composition:

```ts
// If the endpoint returns just one user — return the Dto directly,
// no wrapper object needed:
// GET /users/:id → 200 OK
class UserDto { /* ... */ }

// A Response wrapper is only needed when there is extra data
// alongside the entity (metadata, pagination, tokens, ...):
class ListUsersResponse {
  items: UserDto[];
  total: number;
}
```

Rule of thumb: **do not wrap a single entity in a `Response` container** — return the `Dto` directly. Introduce a `Response` class only when the payload consists of more than the entity itself.

- Validate incoming bodies with `class-validator` decorators on `Request`/`Query` classes.
- Controllers accept `Request`/`Query` and return `Response` — never raw domain aggregates. Map domain → `Dto`/`Response` explicitly.

## 9. Code Style

- Separate the final import declaration from the following code with exactly one blank line. ESLint enforces a blank line after the import block; Prettier keeps its spacing consistent.
- TypeScript `strict` mode is on — no `any`, no `!` non-null assertions unless justified.
- **No comments in code — strictly forbidden.** Do not write `//`, `/* */`, JSDoc, or explanatory comments anywhere in `src/`. Code must be self-explanatory: descriptive names, small functions, explicit types. If code needs a comment to be understood, it must be refactored instead of commented.
- **Blank lines between declarations.** Every top-level `class`, `function`, and arrow-function constant is separated from the surrounding code by exactly one blank line above and one blank line below. In ordinary classes, including domain entities, consecutive field declarations are written **without** blank lines between them; database entities and DTOs follow the separate field-spacing rule below; all other members (constructor, getters/setters, methods) are separated from each other and from the field block by exactly one blank line. Never glue anything other than a run of fields together. Decorators stay attached to the declaration they decorate — no blank line between a decorator and its class/member.

  ```ts
  // ❌ FORBIDDEN — declarations glued to each other (except consecutive fields)
  import { Injectable } from "@nestjs/common";
  @Injectable()
  export class UserService {
    private readonly logger = new Logger(UserService.name);
    constructor() {}
    find(): void {}
  }

  // ✅ CORRECT — blank line above and below the class, fields grouped together,
  // blank line between the field block, constructor, and methods
  import { Injectable } from "@nestjs/common";

  @Injectable()
  export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly repository: UserRepository;

    constructor() {}

    find(): void {}
  }
  ```
- **Constructor parameter properties.** Declare fields supplied through constructor arguments directly as TypeScript parameter properties in all classes, including domain entities, value objects, services, controllers, guards, repositories, and handlers. For example, use `constructor(private readonly repository: UserRepository) {}` instead of a separate declaration and assignment. Preserve visibility, readonly modifiers, optional parameters, defaults, validation, and normalization. Keep explicit fields for property decorators, internally computed state, and cases where the stored field type differs from the constructor input type. Database entities and DTOs retain property decorators and their field-spacing convention. ESLint enforces parameter properties where applicable.
- **Database entity and DTO fields.** In ORM database entities and DTO classes (including Request, Query, Response, and shared transport contracts), put each field decorator on its own line directly above the field. Never put a decorator and a field on the same line, or multiple field decorators on the same line. Do not insert blank lines between decorators or between the last decorator and its field. Separate every field from the next field or member with exactly one blank line, including fields without decorators. Do not add a trailing blank line before the class closing brace. This overrides the grouped-field convention for these classes. ESLint enforces this in `src/**/infrastructure/entity/`, `src/**/dto/`, `src/shared/exception/response/`, `src/shared/query/`, and `src/shared/pagination/`.

  ```ts
  export class UserDto {
    @ApiProperty({ format: "uuid" })
    @IsUUID()
    id: string;

    @ApiProperty()
    @IsString()
    name: string;
  }
  ```

- Blank lines around control-flow blocks. Every `if` / `for` / `while` block — including single-line guard clauses — and every array traversal callback (`.map`, `.filter`, `.forEach`, `.reduce`, `.find`, `.some`, `.every`, `.flatMap`, `.sort`, ...) is separated from the surrounding statements by exactly one blank line above and below. Exceptions: `else` / `else if` stay attached to the closing brace of the previous branch, and a block is not padded directly against its parent block's `{` or `}`.
- **Value object constraint names.** Export length limits with the full semantic name in `SCREAMING_SNAKE_CASE`, e.g. `BROWSER_NAME_MAX_LENGTH`, `OPERATING_SYSTEM_NAME_MAX_LENGTH`, `CLIENT_SECRET_MIN_LENGTH`. Do not export generic `MAX_LENGTH` or `MIN_LENGTH` names. Import and use the original descriptive names directly, without shortening them through aliases.
- File naming: kebab-case (`create-user-command.handler.ts`). Class naming: PascalCase with kind suffixes as defined above.
- File-name suffixes reflect the artifact kind:

| Kind | Suffix | Example |
|---|---|---|
| Interface / type contract | `.type.ts` | `value-object.type.ts`, `repository.type.ts` |
| Enum | `.enum.ts` | `sort-order.enum.ts` |
| Query DTO | `.query.ts` | `pagination.query.ts` |
| Response DTO | `.response.ts` | `pagination.response.ts` |
| Filter | `.filter.ts` | `exception.filter.ts` |
| Plain class without a category | no suffix | `field-error.ts`, `pagination-meta.ts` |

- Error responses use these statuses: BadRequest 400, Unauthorized 401, Forbidden 403, NotFound 404, Conflict 409, Validation 422 (semantic validation errors carry `FieldError[]`), InternalServerError 500.
- Lint with **ESLint**, format with **prettier** — run both before considering work done.
- Tests are run with **jest** and live next to the code they cover (`*.spec.ts`).
- **Note: tests are not written in the project yet**, but they definitely will be in the future. Do not create test files for now; keep the code structured so tests can be added easily later (dependencies injected, pure domain logic, no hidden globals).
- Keep handlers/controllers thin. Business rules belong in the domain layer.

## 10. Prohibitions for Agents

1. **No additional top-level directories** — `src/` contains application folders `shared/`, `modules/`, `config/`, and database migrations in `migrations/`. Public static files belong in the root-level `static/` folder next to `src/`.
2. **No relative imports at all** (`./` or `../`) in `src/` — aliases only (§4).
3. **No `process.env` outside `config/`** — `ConfigService` only (§5).
4. **No business logic in controllers** — controllers map HTTP ⇄ commands/queries.
5. **No DB access outside repositories** — and never inside `domain/`.
6. **No domain imports of framework/ORM code** — the domain stays pure.
7. **No cross-aggregate imports of internals** — use events or public contracts.
8. **No schema changes without a migration.**
9. **No committing secrets** — everything sensitive goes to env.
10. **No comments in code** — no `//`, `/* */`, or JSDoc anywhere in `src/` (§9).
11. **No glued declarations** — one blank line between class members (constructor, getters/setters, methods) and around top-level classes/functions; consecutive field declarations stay grouped without blank lines except in database entities and DTOs, where every field is separated by one blank line; field decorators in database entities and DTOs each occupy their own line directly above the field (§9).
12. **Do not delete or rewrite existing conventions** in this file without explicit user instruction.

## 11. Definition of Done

Before finishing any task, verify:

- [ ] Module files are in the correct DDD folders; shared files are grouped by purpose.
- [ ] All imports use `@shared`, `@modules`, `@config` aliases.
- [ ] All env access goes through `ConfigService`.
- [ ] DTOs follow the `Query` / `Request` / `Response` / `Dto` naming rules.
- [ ] Commands/Queries/Events follow the CQRS naming rules.
- [ ] `eslint` and `prettier` pass.
- [ ] Tests are currently not required (the project does not have tests yet), but the code must be written testable — constructor injection, pure domain logic, no hidden side effects.
- [ ] Commit message follows the Git Conventions (§12).

## 12. Git Conventions — Commits

Commits follow the **Conventional Commits / Gitflow** style:

```
<type>(<scope>): <short imperative summary>
```

- **type** (mandatory), one of:
  - `feat` — new feature
  - `fix` — bug fix
  - `refactor` — code change that neither adds a feature nor fixes a bug
  - `chore` — tooling, deps, config, build scripts, docs
  - `docs` — documentation only
  - `test` — adding or fixing tests
  - `perf` — performance improvement
  - `style` — formatting, no logic change
  - `revert` — reverting a previous commit
- **scope** (optional but recommended) — the area of the change, e.g. `shared`, `modules`, `config`, an aggregate name (`user`, `session`, `oauth`), or `db` / `ci`.
- **summary** — short, lowercase, imperative, no trailing period, ≤ 72 chars.

Examples:

```
feat(user): add user registration endpoint
fix(config): load env files per NODE_ENV
refactor(account): extract email verification into domain service
chore: update typeorm to 1.1.2
docs: describe commit conventions in AGENT.md
```

Rules:

- One logical change per commit; do not mix unrelated changes.
- Never commit `.env`, `.env.development`, `.env.production`, secrets, or build artifacts (`dist/`, `*.tsbuildinfo`) — they are gitignored.
- Never commit directly to `main`/`master`; use feature branches (`feat/<name>`, `fix/<name>`, etc.) and merge via pull request, per Gitflow.
