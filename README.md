# Backend Boilerplate

Plantilla genérica para arrancar cualquier proyecto backend con:

- **Node.js** + **Fastify** (TypeScript, ESM)
- **PostgreSQL** como base de datos
- **Docker** para desarrollo y para tests (contenedores independientes)
- **Zod** para validar variables de entorno y rutas (entrada y respuesta) con tipos inferidos, vía `fastify-type-provider-zod`
- **node-pg-migrate** para migraciones de base de datos (en TypeScript)
- **Vitest** para tests de integración
- **TypeScript** con strict mode y ESLint + typescript-eslint
- **OpenAPI (`@fastify/swagger`) + Scalar** para documentación interactiva de la API
- **GitHub Actions** ejecutando type-checking, lint y tests en cada PR

## Estructura

```
src/
  app.ts            # construye la instancia de Fastify (registra plugins y rutas explícitamente)
  server.ts         # arranca el servidor HTTP
  config/           # carga y valida variables de entorno con Zod
  plugins/          # plugins de Fastify (BD, JWT, CORS, rate limit, autorización, errores, Swagger)
  features/         # features organizadas por dominio
    auth/           # autenticación: routes, controller, service, repository, schema, exceptions
    users/          # usuarios: routes, controller, service, repository, schema, exceptions
    health/         # health check
    providers/      # verificación específica de cada proveedor de identidad (Google, ...)
  shared/           # código compartido
    types.ts        # tipos de dominio (User, Identity, etc.)
    fastify-types.ts # ZodRequest/ZodReply: tipos de controllers a partir del schema de la ruta
    exceptions/     # excepciones base (AppException)
    schemas/        # schemas Zod compartidos (errorResponse)
  types/            # declaraciones de tipos para módulos externos (fastify.d.ts)
migrations/         # migraciones de node-pg-migrate (en TypeScript)
templates/          # plantilla de migración usada por `pnpm migrate:create`
test/               # tests de integración con Vitest (fastify.inject)
rest/               # ficheros .rest para probar endpoints (extensión REST Client de VSCode)
dist/               # salida compilada (generado por `pnpm build`)
```

## Documentación interactiva (Scalar)

Con el servidor levantado, abre `http://localhost:3000/reference` para ver la documentación interactiva de la API (generada a partir de los schemas Zod de cada ruta vía `@fastify/swagger` + `jsonSchemaTransform`, renderizada con [Scalar](https://scalar.com)). El documento OpenAPI en bruto está en `/reference/openapi.json` (o `.yaml`).

Para documentar una ruta nueva, añade `tags`, `summary`/`description` y, si está protegida, `security: [{ bearerAuth: [] }]` a su schema Zod (ver `src/features/auth/auth.schema.ts` como ejemplo) — no hace falta tocar `src/plugins/swagger.ts`.

## Autenticación e identidades

El login funciona por proveedores de identidad externos (actualmente solo Google) en vez de contraseña propia:

- `users`: el perfil de la cuenta (`id`, `name`, `email`, `avatar_url`).
- `identities`: qué proveedores tiene vinculados cada usuario (`provider`, `provider_user_id`, `user_id`), con `(provider, provider_user_id)` único.
- `refresh_tokens`: refresh tokens opacos (no JWT) por usuario, con hash guardado (no el valor en claro), fecha de expiración y revocación — independientes del proveedor usado para el login.

Cada login (`POST /auth/google`) devuelve `{ accessToken, refreshToken, user }`. El `accessToken` (JWT, corta duración vía `JWT_EXPIRES_IN`) se usa en `Authorization: Bearer` para las rutas protegidas. Cuando expira, `POST /auth/refresh` con `{ refresh_token }` devuelve un par nuevo `{ accessToken, refreshToken }` y **revoca el refresh token usado** (rotación): cada refresh token solo sirve una vez, así que si se reutiliza uno ya rotado (p. ej. porque fue robado), la petición falla con 401.

`POST /auth/logout` (protegido) revoca de golpe **todos** los refresh tokens vivos del usuario autenticado (todas las sesiones/dispositivos), para el caso de robo de dispositivo o simplemente cerrar sesión en todos lados. El `accessToken` en curso sigue siendo válido hasta que expire por su cuenta (es un JWT stateless, no se puede revocar antes de tiempo), pero ya no podrá renovarse con `/auth/refresh`.

`src/features/auth/identity.service.ts` centraliza la lógica de "buscar la identidad o crear/enlazar el usuario", independiente del proveedor. `src/features/providers/google.ts` verifica el `id_token` de Google y devuelve un perfil normalizado (`{ provider, providerUserId, email, emailVerified, name, avatarUrl }`) que ese servicio consume.

### Añadir un nuevo proveedor de identidad

1. Crea `src/features/providers/<proveedor>.ts` con una función que verifique la credencial de ese proveedor (token, code, etc.) y devuelva `{ provider: '<proveedor>', providerUserId, email, emailVerified, name, avatarUrl }`. `emailVerified` debe reflejar si el proveedor confirma que el email es del usuario (ej. `email_verified` en Google) — si no es `true`, `identity.service.ts` rechaza la creación/enlace de cuenta por email para evitar que alguien reclame la cuenta de otra persona.
2. Añade un endpoint en `src/features/auth/auth.routes.ts` (ej. `POST /auth/<proveedor>`) con su handler en `src/features/auth/auth.controller.ts`, que llame a esa función y luego a `findOrCreateUserFromIdentity` de `identity.service.ts`.
3. Si el proveedor requiere client id/secret, añádelos a `src/config/index.ts` y a `.env.example`.

No hace falta tocar el esquema de `users` ni `identities` para añadir proveedores nuevos.

## Inicio rápido (make)

El proyecto incluye un `Makefile` con los comandos más habituales, para no memorizar los `docker compose` largos:

```bash
make up             # crea .env/.env.test si no existen y levanta backend + db
make migrate-up     # aplica migraciones dentro del contenedor backend
make test           # vitest en modo watch + UI (http://localhost:51204) en su contenedor aislado
make test-ci        # corre los tests una sola vez (modo CI) en su contenedor aislado
make down           # detiene y elimina los contenedores de desarrollo
make help           # lista todos los comandos disponibles
```

Por defecto usa el binario `docker-compose`. Si en tu máquina tienes el plugin moderno `docker compose` (con espacio), pasa `DC="docker compose"` (o cambia el valor por defecto al principio del `Makefile`):

```bash
make up DC="docker compose"
```

## Redes corporativas con inspección TLS (Netskope, etc.)

Si `docker compose build` falla con un error del tipo `self-signed certificate in certificate chain` al instalar dependencias, tu red está interceptando TLS. Define `STRICT_SSL=false` en tu `.env` (o como variable de entorno del shell) para desactivar la verificación TLS solo durante el build de las imágenes:

```
STRICT_SSL=false
```

Por defecto es `true` (verificación activada); sin definir la variable, el comportamiento es exactamente el mismo que sin proxy corporativo.

> ⚠️ Con `STRICT_SSL=false` las descargas de dependencias durante el build no verifican la identidad del servidor remoto. Úsalo solo si es imprescindible en tu red corporativa, y no lo dejes activado en pipelines fuera de esa red.

## Probar endpoints sin Postman

En `rest/` hay un fichero `.rest` por recurso (`health.rest`, `auth.rest`) pensado para la extensión [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) de VSCode. Con el servidor levantado (`docker compose up` o `pnpm dev`), abre el fichero y pulsa "Send Request" sobre cada petición.

## Desarrollo local (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta dos contenedores: `db` (Postgres persistente) y `backend` (Fastify con hot-reload vía tsx, puerto 3000).

Aplicar migraciones dentro del contenedor de backend:

```bash
docker compose exec backend pnpm migrate:up
```

## Debug paso a paso

El servidor arranca siempre con el inspector de Node activo (`tsx watch --inspect=0.0.0.0:9229`), y `docker-compose.yml` publica el puerto `9229`. Con `docker compose up` (o `make up`) levantado:

1. Pon breakpoints en el código (`src/**/*.ts`).
2. En VSCode, pestaña "Run and Debug" → **"Debug: Docker backend (make up)"** → Start.

Se reconecta solo tras cada reload de `tsx watch` (`"restart": true` en `.vscode/launch.json`), así que puedes dejar la sesión de debug abierta mientras editas.

Para depurar los tests paso a paso (requiere un Postgres accesible por `DATABASE_URL` en `.env.test`, p. ej. el de `docker-compose.yml` apuntando a `localhost:5435`): lanza **"Debug: tests (vitest, local)"** desde VSCode, que ejecuta `pnpm test:debug` (`vitest --inspect-brk`) y para en el primer breakpoint.

## Tests (contenedor independiente)

Los tests corren en un contenedor **distinto** al de desarrollo, contra su propia base de datos efímera (`db-test`), para no compartir estado con el entorno de desarrollo:

```bash
cp .env.test.example .env.test
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test --attach test
```

El contenedor `test` migra automáticamente `db-test` (en silencio, `--no-verbose`) y luego ejecuta Vitest (`pnpm run test:ci`). `--attach test` hace que solo se muestre la salida de Vitest, sin mezclar los logs del contenedor `db-test` (Postgres).

Para limpiar el contenedor/volumen de test:

```bash
docker compose -f docker-compose.test.yml down -v
```

## Desarrollo sin Docker

Requiere Node 22+, pnpm y un Postgres accesible via `DATABASE_URL`. En `.env.example` el host es `db` (servicio de Docker Compose): sin Docker cámbialo por `localhost` (o `localhost:5435` si usas el Postgres de `docker-compose.yml`).

```bash
pnpm install
cp .env.example .env
pnpm migrate:up
pnpm dev  # inicia tsx watch src/server.ts con recarga en caliente
```

Para ejecutar los tests localmente (contra el mismo Postgres de desarrollo):

```bash
pnpm test --run  # una sola pasada
# o
pnpm test  # modo watch
```

## Estilo de código (ESLint + Prettier)

El proyecto usa [ESLint](https://eslint.org) con typescript-eslint (config en `eslint.config.js`) y [Prettier](https://prettier.io) (config en `.prettierrc.json`) para que todo el equipo escriba y formatee igual sin discutirlo caso a caso:

```bash
pnpm lint          # ESLint + comprobación de formato (no modifica archivos)
pnpm format        # reformatea todo el proyecto con Prettier
pnpm format:check  # solo comprueba el formato (útil en CI)
```

Configura tu editor para formatear al guardar con Prettier, o ejecuta `pnpm format` antes de cada commit.

## Convenciones de TypeScript

- **Imports relativos con extensión `.js`**, aunque el archivo sea `.ts` (ESM + `moduleResolution: NodeNext`). Detalle en `ARCHITECTURE.md`.
- **Plugins registrados explícitamente** en `src/app.ts` (no hay autoload).
- **Controllers tipados con `ZodRequest`/`ZodReply`**, sin casts; los tipos salen del schema Zod de la ruta.

## Integración continua (GitHub Actions)

`.github/workflows/ci.yml` corre en cada Pull Request (y en push a `main`):

- **typecheck**: `pnpm typecheck` (TypeScript strict mode, sin Docker).
- **lint**: `pnpm lint` (ESLint + Prettier en modo check, sin Docker).
- **test**: `make test-ci` con Docker Compose (Vitest, misma suite que en local, contra Postgres real).

## Scripts

| Script                | Descripción                                  |
| --------------------- | -------------------------------------------- |
| `pnpm build`          | Compila TypeScript a JavaScript (`dist/`)    |
| `pnpm dev`            | Arranca el servidor con hot-reload (tsx)     |
| `pnpm start`          | Arranca el servidor compilado en producción  |
| `pnpm migrate:up`     | Aplica migraciones pendientes (`--tsx`)      |
| `pnpm migrate:down`   | Revierte la última migración                 |
| `pnpm migrate:create` | Crea una migración `.ts` desde la plantilla  |
| `pnpm typecheck`      | Comprueba tipos de TypeScript (tsc --noEmit) |
| `pnpm lint`           | Ejecuta ESLint y Prettier (comprobación)     |
| `pnpm test`           | Ejecuta los tests con Vitest (modo watch)    |
| `pnpm test:watch`     | Alias de `pnpm test`                         |
| `pnpm test:ui`        | Abre la interfaz web de Vitest               |
| `pnpm test:ci`        | Migra la BD de test y ejecuta los tests      |
| `pnpm format`         | Reformatea todo el proyecto con Prettier     |
| `pnpm format:check`   | Comprueba el formato sin modificar archivos  |

## Añadir un nuevo recurso

1. Crea la carpeta `src/features/<recurso>/`.
2. Crea el schema Zod en `src/features/<recurso>/<recurso>.schema.ts` (añade `tags`/`summary`/`security` para que aparezca bien documentado en `/reference`).
3. Añade el tipo de dominio en `src/shared/types.ts` y, si hace falta, las excepciones en `src/features/<recurso>/exceptions.ts`.
4. Crea el repositorio en `src/features/<recurso>/<recurso>.repository.ts` (acceso a datos).
5. Crea el servicio en `src/features/<recurso>/<recurso>.service.ts` (lógica de negocio).
6. Crea el controlador en `src/features/<recurso>/<recurso>.controller.ts` (handlers de rutas).
7. Crea las rutas en `src/features/<recurso>/<recurso>.routes.ts` y regístralas en `src/app.ts`.
8. Crea la migración con `pnpm migrate:create <nombre>` y aplícala con `pnpm migrate:up`.
9. Crea `rest/<recurso>.rest` con las peticiones de ejemplo para ese recurso.
10. Crea los tests en `test/<recurso>.test.ts`.
