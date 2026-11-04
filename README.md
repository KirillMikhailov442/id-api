<div align="center">
  <img src="./static/images/favicon.svg" alt="Mikh SSO API" width="120" height="120" />
  <h1>Mikh SSO API</h1>
  <img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white" alt="pnpm" />
</div>

Mikh SSO API — серверная часть сервиса единого входа. API централизует регистрацию, вход и управление учётными записями, а подключённым приложениям предоставляет доступ через OAuth 2.0 и OpenID Connect. Веб-интерфейс личного кабинета, экрана согласия и панели администратора находится в отдельном репозитории. [Mikh SSO Web](https://github.com/mikh-space/id-app)

## Что реализовано

- Регистрация, подтверждение электронной почты, вход по почте и паролю или через Google.
- Управление профилем, смена пароля, просмотр и завершение активных сессий.
- Управление пользователями и ролями, блокировка аккаунтов и отзыв сессий.
- Регистрация OAuth-клиентов, управление разрешениями, выдача токенов и отзыв доступа приложений.
- Выдача ID-токенов и публикация публичных ключей для проверки подписи через JWKS.

## Стек

- Node.js, TypeScript и NestJS с `@nestjs/cqrs`.
- PostgreSQL и TypeORM для хранения данных и миграций, Redis для отзыва сессий и хранения попыток входа через Google.
- Nodemailer для отправки писем, Swagger UI для документации API.
- Jest для модульных и интеграционных тестов, ESLint и Prettier для проверок кода.

## Архитектура и структура

Проект разрабатывается по принципам **DDD** (Domain-Driven Design) и **CQRS** (Command Query Responsibility Segregation). Доменные модели и бизнес-правила отделены от HTTP и базы данных. Команды изменяют состояние, запросы читают данные, а доменные события связывают модули через NestJS EventBus.

- `src/modules/user` — пользователи, роли и управление учётными записями.
- `src/modules/session` — аутентификация, сессии и вход через Google.
- `src/modules/oauth` — клиенты, разрешения, токены и доступ подключённых приложений.
- `src/shared` — общие контракты и сервисы, `src/config` — конфигурация приложения и подключения к инфраструктуре.
- `src/migrations` — миграции схемы PostgreSQL, `test/integration` — интеграционные тесты, `static` — публичные файлы.

Каждый доменный модуль разделён на `domain` (модель и правила), `application` (команды, запросы и обработчики), `infrastructure` (реализации репозиториев и адаптеры) и `presentation` (контроллеры и DTO).

## Локальный запуск

Понадобятся Node.js 24, pnpm 12.3.4, Make и Docker с Compose. Выполните из корня репозитория:

```bash
pnpm install --frozen-lockfile
cp -n .env.example .env.development
```

Настройте `.env.development` по шаблону `.env.example`. При использовании стандартного Compose укажите `DB_NAME=test`. Задайте свои значения `JWT_ACCESS_SECRET` и `EMAIL_CONFIRM_SECRET`, заполните `ID_TOKEN_PRIVATE_KEY` приватным RSA-ключом в формате PEM и настройте SMTP для отправки писем. Для входа через Google заполните `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` и `GOOGLE_REDIRECT_URI`. Если Google-вход не нужен, оставьте первые две переменные пустыми.

При первом запуске подготовьте базу, затем запустите API:

```bash
docker compose up -d --wait postgres redis
make migrate
make seed
make dev
```

С настройками из шаблона API доступен по адресу `http://localhost:8080/api/v1`, а Swagger UI — по адресу `http://localhost:8080/docs/swagger`.

## Переменные окружения

В таблицах указаны значения из [`.env.example`](./.env.example). Значения секретов в шаблоне служат примерами.

При запуске через `make dev` API читает `.env.development`, а при запуске через `pnpm start:prod` — `.env.production`. В обоих случаях недостающие значения берутся из `.env`, а переменные окружения процесса имеют приоритет над файлами.

При запуске через текущий `docker-compose.yml` сервис `api` получает переменные из `.env.development`. Значения из секции `environment`, включая `NODE_ENV=production`, имеют приоритет.

### Приложение и лимиты запросов

| Переменная | Значение в шаблоне | Назначение |
| --- | --- | --- |
| `PORT` | `8080` | HTTP-порт API |
| `API_GLOBAL_PREFIX` | `api` | Общий префикс маршрутов API |
| `APP_BASE_URL` | `http://localhost:8080` | Публичный адрес API, используемый в том числе как издатель токенов |
| `APP_WEB_URL` | `http://localhost:3000` | Адрес веб-клиента |
| `SWAGGER_PATH` | `docs/swagger` | Путь к Swagger UI |
| `THROTTLE_TTL` | `60` | Окно ограничения частоты запросов в секундах |
| `THROTTLE_LIMIT` | `100` | Максимальное число запросов за окно |

### PostgreSQL и Redis

| Переменная | Значение в шаблоне | Назначение |
| --- | --- | --- |
| `DB_HOST` | `127.0.0.1` | Хост PostgreSQL |
| `DB_PORT` | `5432` | Порт PostgreSQL |
| `DB_NAME` | `id-api` | Имя базы данных. Для стандартного Compose укажите `test` |
| `DB_USERNAME` | `postgres` | Пользователь PostgreSQL |
| `DB_PASSWORD` | `postgres` | Пароль PostgreSQL |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Строка подключения к Redis |
| `REDIS_CONNECT_TIMEOUT` | `5000` | Таймаут подключения к Redis в миллисекундах |
| `REDIS_COMMAND_TIMEOUT` | `5000` | Таймаут команды Redis в миллисекундах |

### Сессии, OAuth 2.0 и OpenID Connect

| Переменная | Значение в шаблоне | Назначение |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | `change-me` | Секрет подписи access-токенов сессии SSO |
| `JWT_ACCESS_TTL` | `900` | Срок действия access-токена сессии в секундах |
| `REFRESH_TOKEN_TTL` | `2592000` | Срок действия refresh-токена сессии в секундах |
| `AUTHORIZATION_CODE_TTL` | `600` | Срок действия кода авторизации OAuth в секундах |
| `OAUTH_ACCESS_TTL` | `900` | Срок действия access-токена OAuth в секундах |
| `OAUTH_REFRESH_TTL` | `2592000` | Срок действия refresh-токена OAuth в секундах |
| `OAUTH_AUDIENCE` | `id-api` | Значение `aud` в access-токенах OAuth |
| `ID_TOKEN_TTL` | `3600` | Срок действия ID-токена в секундах |
| `ID_TOKEN_PRIVATE_KEY` | Пусто | Обязательный приватный RSA-ключ в формате PEM для подписи ID-токенов и access-токенов OAuth |
| `TOKEN_HISTORY_RETENTION_DAYS` | `30` | Срок хранения истории токенов в днях |

### Вход через Google

| Переменная | Значение в шаблоне | Назначение |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Идентификатор OAuth-клиента Google |
| `GOOGLE_CLIENT_SECRET` | `your-client-secret` | Секрет OAuth-клиента Google |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8080/api/v1/auth/google/callback` | Адрес обратного вызова, зарегистрированный в настройках клиента Google |
| `EXTERNAL_LOGIN_TTL` | `600` | Срок действия попытки входа в секундах |
| `EXTERNAL_LOGIN_HTTP_TIMEOUT` | `10000` | Таймаут HTTP-запросов к Google в миллисекундах |

### Почта и подтверждение адреса

| Переменная | Значение в шаблоне | Назначение |
| --- | --- | --- |
| `SMTP_HOST` | `smtp.example.com` | Хост SMTP-сервера |
| `SMTP_PORT` | `587` | Порт SMTP-сервера |
| `SMTP_USER` | `no-reply@example.com` | Пользователь SMTP |
| `SMTP_PASSWORD` | `change-me` | Пароль SMTP |
| `SMTP_SECURE` | `false` | Установите `true` для TLS с начала SMTP-соединения |
| `MAIL_FROM` | `SSO <no-reply@example.com>` | Имя и адрес отправителя |
| `EMAIL_CONFIRM_SECRET` | `change-me-mail-secret` | Секрет подписи токенов подтверждения почты |
| `EMAIL_CONFIRM_TTL` | `86400` | Срок действия токена подтверждения почты в секундах |

## Команды

| Команда | Что делает |
| --- | --- |
| `make dev` | Поднимает PostgreSQL и Redis и запускает API в режиме наблюдения |
| `make dev-down` | Останавливает PostgreSQL и Redis с сохранением данных |
| `make migrate` | Применяет миграции схемы к локальной базе |
| `make seed` | Добавляет недостающие системные роли и OAuth-скоупы |
| `make test` | Запускает модульные тесты Jest |
| `pnpm test:integration` | Запускает интеграционные тесты с отдельными PostgreSQL и Redis |
| `make lint` | Проверяет код через ESLint без автоисправлений |
| `pnpm format` | Форматирует файлы через Prettier |
| `make build` | Собирает API в `dist/` |
| `make help` | Показывает доступные цели Make |

Если API запускается в Docker Compose, примените миграции и сиды через сервис `migrate`:

```bash
docker compose run --rm migrate
docker compose run --rm migrate pnpm seed
docker compose up -d --build api
```
