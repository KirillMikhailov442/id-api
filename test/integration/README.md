# Интеграционные тесты

```sh
pnpm test:integration
```

Команда запускает отдельные PostgreSQL и Redis на свободных локальных портах, выполняет тесты и удаляет временные процессы и данные. Нужны установленные PostgreSQL (`postgres`, `initdb`, `pg_ctl`) и `redis-server`. Postgres.app обнаруживается автоматически; для другой установки можно указать `PG_BIN=/path/to/postgres/bin`.

Тесты применяют настоящие миграции проекта, без `synchronize`. Каждый набор получает отдельную случайную схему PostgreSQL. Redis использует уникальные идентификаторы; очистка удаляет только созданные тестами ключи, без `FLUSHDB`. `.env.development` и `.env.production` не загружаются.

Проверяются репозитории пользователей, ролей, внешних идентификаторов, клиентов, scopes, authorization codes, сессий и OAuth grants/refresh tokens; ограничения БД, rollback, advisory/row locks, конкурентная ротация и отзыв токенов. Отдельно проверяются Redis TTL, совместимость старых ключей отзыва, атомарный `GETDEL` и недоступное соединение. OAuth-потоки используют настоящие bcrypt, JWT и хранилища.

## Docker или внешнее тестовое окружение

```sh
docker compose -f docker-compose.integration.yml up -d --wait
INTEGRATION_DATABASE_URL=postgres://integration:integration@127.0.0.1:15432/integration \
INTEGRATION_REDIS_URL=redis://127.0.0.1:16379 \
pnpm test:integration
docker compose -f docker-compose.integration.yml down
```

Нужно передать обе переменные. Скрипт не запускает и не останавливает внешние сервисы. Используйте отдельные тестовые экземпляры; пользователю PostgreSQL нужны права создания схем. В Docker PostgreSQL хранит данные в tmpfs.

Обычный `pnpm test` запускает прежние unit/HTTP-тесты без зависимости от PostgreSQL и Redis.

```sh
pnpm test:integration --testPathPatterns=session-repository
pnpm test:integration --coverage
```
