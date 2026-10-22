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
| Linting | oxlint |
| Formatting | prettier |
| Testing | jest |

## 2. Directory Architecture

All source code lives in `src/` with exactly three top-level directories. **Never create new top-level directories.**

```
src/
├── shared/                        # PUBLIC shared kernel — usable by every module
│   ├── domain/                    # Base domain contracts: IValueObject, IRepository, RoleType, InvalidValueObjectException
│   ├── infrastructure/            # Reusable infrastructure: mail/, transaction/
│   └── presentation/              # Shared presentation contracts, split by purpose:
│       ├── auth/                  #   Public/Roles/CurrentUser decorators, authenticated request types
│       ├── query/                 #   input query contracts (pagination/sort/search)
│       ├── response/              #   outgoing response envelopes (pagination meta + response)
│       └── exception/             #   exception handling: filters/, factories/, responses/
├── modules/                       # Feature aggregates (user, session, oauth, ...)
│   └── <aggregate-name>/
│       ├── domain/                # Aggregate roots, value objects, domain events, domain interfaces
│       ├── infrastructure/        # Repositories, TypeORM entities, external service adapters
│       ├── presentation/          # Controllers, DTOs
│       ├── application/           # Command/Query handlers, event handlers (when the aggregate needs CQRS plumbing)
│       └── <aggregate>.module.ts  # NestJS module + tokens at the root of the aggregate folder
└── config/                        # App configuration: DB connection, logger, env loading & validation
```

### What goes where

| Artifact | Location |
|---|---|
| Aggregate roots, entities (domain), value objects | `<aggregate>/domain/` |
| Domain events | `<aggregate>/domain/` (events subfolder) |
| Domain repository interfaces (ports) | `<aggregate>/application/port/` |
| Base domain contracts (`IValueObject`, `IRepository`) | `shared/domain/` |
| Shared query contracts (pagination, sort, search) | `shared/presentation/query/` |
| Shared response envelopes (pagination meta + response) | `shared/presentation/response/` |
| Shared exception handling: `ExceptionFilter`, `validationExceptionFactory`, exception responses | `shared/presentation/exception/` |
| Generic infrastructure (`MailService`, `TemplateRenderer`, `DbTransactionRunner`) | `shared/infrastructure/` |
| Command / Query handlers | `<aggregate>/application/` |
| Event handlers (EventBus subscribers) | `<aggregate>/application/` |
| TypeORM entities, repository implementations | `<aggregate>/infrastructure/` |
| Controllers, guards, pipes | `<aggregate>/presentation/` |
| Request / Query / Response / Dto classes | `<aggregate>/presentation/` (DTO subfolder) |
| Module wiring (NestJS `@Module`) | root of the aggregate folder |
| DB connection, env validation, logger setup | `config/` |

### shared vs modules

- `shared/` is the **public shared kernel**: every module may import from it (`@shared/*`). It owns only contracts and generic infrastructure — no aggregate-specific logic.
- `modules/` holds **feature aggregates**. Each aggregate mirrors the same DDD folder structure. The **User aggregate** (`modules/user`) is the central domain of the SSO.
- Aggregates must not reach into another aggregate's internals — use its public module exports (`<aggregate>.module.ts`, `<aggregate>.tokens.ts`), public interfaces or domain events.
- Per-module Swagger decorators (`exception-response.decorator.ts`) live in each aggregate's `presentation/` and build on `shared/presentation/exception/` helpers (`responseExample`, `ApiValidationFailedResponse`).

## 3. Dependency Rules

Dependencies always point **toward the domain**:

```
presentation ──▶ domain ◀── infrastructure
```

- `domain/` must not import from `infrastructure/`, `presentation/`, or any framework package. The domain is pure TypeScript.
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
import { FieldError } from '@shared/presentation/exception/field-error';
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

- TypeScript `strict` mode is on — no `any`, no `!` non-null assertions unless justified.
- **No comments in code — strictly forbidden.** Do not write `//`, `/* */`, JSDoc, or explanatory comments anywhere in `src/`. Code must be self-explanatory: descriptive names, small functions, explicit types. If code needs a comment to be understood, it must be refactored instead of commented.
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
- Lint with **oxlint**, format with **prettier** — run both before considering work done.
- Tests are run with **jest** and live next to the code they cover (`*.spec.ts`).
- **Note: tests are not written in the project yet**, but they definitely will be in the future. Do not create test files for now; keep the code structured so tests can be added easily later (dependencies injected, pure domain logic, no hidden globals).
- Keep handlers/controllers thin. Business rules belong in the domain layer.

## 10. Prohibitions for Agents

1. **No new top-level directories** — only `shared/`, `modules/`, `config/` exist under `src/`.
2. **No relative imports at all** (`./` or `../`) in `src/` — aliases only (§4).
3. **No `process.env` outside `config/`** — `ConfigService` only (§5).
4. **No business logic in controllers** — controllers map HTTP ⇄ commands/queries.
5. **No DB access outside repositories** — and never inside `domain/`.
6. **No domain imports of framework/ORM code** — the domain stays pure.
7. **No cross-aggregate imports of internals** — use events or public contracts.
8. **No schema changes without a migration.**
9. **No committing secrets** — everything sensitive goes to env.
10. **No comments in code** — no `//`, `/* */`, or JSDoc anywhere in `src/` (§9).
11. **Do not delete or rewrite existing conventions** in this file without explicit user instruction.

## 11. Definition of Done

Before finishing any task, verify:

- [ ] Files are in the correct DDD folders.
- [ ] All imports use `@shared`, `@modules`, `@config` aliases.
- [ ] All env access goes through `ConfigService`.
- [ ] DTOs follow the `Query` / `Request` / `Response` / `Dto` naming rules.
- [ ] Commands/Queries/Events follow the CQRS naming rules.
- [ ] `oxlint` and `prettier` pass.
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
