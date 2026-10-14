DC ?= docker-compose

.PHONY: help install env up dev down stop build build-no-cache logs ps shell \
	migrate-up migrate-down migrate-create lint typecheck format \
	test test-ci test-down test-logs clean

help:
	@echo "Comandos disponibles:"
	@echo "  make install         Instala dependencias localmente (pnpm)"
	@echo "  make env             Crea .env y .env.test a partir de los .example (si no existen)"
	@echo "  make up              Levanta el entorno de desarrollo (backend + db)"
	@echo "  make down            Detiene y elimina los contenedores de desarrollo"
	@echo "  make stop            Detiene los contenedores de desarrollo sin eliminarlos"
	@echo "  make build           Construye las imágenes de desarrollo"
	@echo "  make build-no-cache  Construye las imágenes de desarrollo sin caché"
	@echo "  make logs            Sigue los logs del contenedor backend"
	@echo "  make ps              Lista el estado de los contenedores de desarrollo"
	@echo "  make shell           Abre una shell dentro del contenedor backend"
	@echo "  make migrate-up      Aplica las migraciones pendientes"
	@echo "  make migrate-down    Revierte la última migración"
	@echo "  make migrate-create name=nombre-migracion   Crea una nueva migración"
	@echo "  make typecheck       Comprueba tipos de TypeScript (tsc --noEmit)"
	@echo "  make lint            Comprueba linting y formato (tsc, eslint, prettier)"
	@echo "  make format          Formatea el código con Prettier"
	@echo "  make test            Lanza vitest en modo watch + UI en su contenedor aislado (con su propia BD)"
	@echo "  make test-ci         Ejecuta los tests una sola vez (modo CI) en su contenedor aislado"
	@echo "  make test-down       Elimina los contenedores/volúmenes del entorno de test"
	@echo "  make clean           Elimina contenedores y volúmenes de desarrollo"

install:
	pnpm install

env:
	[ -f .env ] || cp .env.example .env
	[ -f .env.test ] || cp .env.test.example .env.test

up dev: env
	$(DC) up --build

down:
	$(DC) down

stop:
	$(DC) stop

build: env
	$(DC) build

build-no-cache: env
	$(DC) build --no-cache

logs:
	$(DC) logs -f backend

ps:
	$(DC) ps

shell:
	$(DC) exec backend sh

migrate-up:
	$(DC) exec backend pnpm migrate:up

migrate-down:
	$(DC) exec backend pnpm migrate:down

migrate-create:
	$(DC) exec backend pnpm migrate:create $(name)

typecheck:
	pnpm typecheck

lint: typecheck
	pnpm lint

format:
	pnpm format
	
test: env
	$(DC) -f docker-compose.test.yml up --build

test-ci: env
	$(DC) -f docker-compose.test.yml run --rm --build test pnpm run test:ci

test-down:
	$(DC) -f docker-compose.test.yml down -v

test-logs:
	$(DC) -f docker-compose.test.yml logs -f test

clean:
	$(DC) down -v
