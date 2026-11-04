.DEFAULT_GOAL := help

.PHONY: help dev dev-down migrate seed test lint build

help:
	@printf '%s\n' \
		'make dev       Start PostgreSQL and Redis, then run the API in watch mode' \
		'make dev-down  Stop PostgreSQL and Redis and keep their data' \
		'make migrate   Apply local database migrations' \
		'make seed      Insert missing system roles and OAuth scopes' \
		'make test      Run unit tests' \
		'make lint      Check the code with ESLint' \
		'make build     Build the API' \
		'make help      Show available commands'

dev:
	docker compose up -d --wait postgres redis
	pnpm start:dev

dev-down:
	docker compose stop postgres redis

migrate:
	NODE_ENV=development pnpm migration:run

seed:
	NODE_ENV=development pnpm seed

test:
	pnpm test

lint:
	pnpm exec eslint .

build:
	pnpm build
