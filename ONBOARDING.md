# Guía de Onboarding - TypeScript Backend Boilerplate

## ¡Bienvenida/o!

Este es un template moderno de backend Fastify completamente en **TypeScript** con **ESM**. Está diseñado para ser un punto de partida rápido y seguro para proyectos Backend.

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Clonar y preparar

```bash
git clone <repo-url> my-backend
cd my-backend
pnpm install
cp .env.example .env
cp .env.test.example .env.test
```

### 2. Ejecutar en desarrollo

```bash
make up  # levanta Docker con backend + PostgreSQL
make migrate-up  # aplica migraciones
```

Luego abre `http://localhost:3000/health` → deberías ver `{"status":"ok"}`.

### 3. Ver documentación interactiva

Abre `http://localhost:3000/reference` → es la UI de Scalar con toda la API documentada.

---

## 📋 Estructura Rápida

```
src/
├── config/           # Variables de entorno (tipadas)
├── plugins/          # Extensiones de Fastify (DB, JWT, CORS, error-handling)
├── features/         # Módulos de negocio (auth, users, tu-recurso-aquí)
├── shared/           # Código compartido (tipos, excepciones, schemas)
├── types/            # Augmentación de módulos TypeScript
├── app.ts            # Construye la app Fastify
└── server.ts         # Punto de entrada
```

**Cada feature (`src/features/<nombre>/`) contiene:**

- `.routes.ts` - Endpoints
- `.controller.ts` - Lógica HTTP
- `.service.ts` - Lógica de negocio
- `.repository.ts` - Acceso a BD
- `.schema.ts` - Validaciones y docs (schemas Zod)
- `.exceptions.ts` - Errores específicos

---

## 🔑 Características Principales

### ✅ Validación Tipada con Zod

- Validación segura de variables de entorno en `src/config/`
- Schemas Zod en cada ruta (`body`, `params`, `response`): validan, tipan y generan el OpenAPI
- Controllers tipados sin casts con `ZodRequest`/`ZodReply` (`src/shared/fastify-types.ts`)

### ✅ Autenticación con Google + Refresh Tokens

- Login sin contraseña mediante `id_token` de Google
- Refresh tokens opacos (no JWT) rotables
- Logout múltiple (cierra todas las sesiones)

**Rutas:**

- `POST /auth/google` - Login
- `POST /auth/refresh` - Renovar token
- `GET /auth/me` - Perfil actual
- `POST /auth/logout` - Cerrar sesiones

### ✅ TypeScript Strict Mode

- Tipos en todas partes: interfaces de dominio, request/reply, etc.
- `noUncheckedIndexedAccess` activado para seguridad en índices
- Todos los archivos `.ts` (incluyendo migraciones)

### ✅ ESM Nativo

- `"type": "module"` en `package.json`
- Imports relativos siempre con extensión `.js` (requisito de `moduleResolution: NodeNext`), aunque el archivo sea `.ts`
- `tsx watch` para desarrollo con recarga en caliente
- `tsc` para compilar a `dist/`

### ✅ Tests Automatizados

- **Vitest** en lugar de Jest (más rápido, soporte ESM/TS nativo)
- Tests de integración contra BD real (contenedor aislado)
- `make test` (watch + UI) / `make test-ci` (una sola pasada) ejecutan contra la BD de test efímera

### ✅ Docker Multi-Stage

- Etapa `dev`: hot-reload (tsx watch)
- Etapa `test`: BD aislada, ejecuta tests
- Etapa `prod`: compilada, mínima, usuario no-root

### ✅ CI/CD Listo

- GitHub Actions: typecheck + lint + test en cada PR
- ESLint + Prettier + TypeScript type-checking

---

## 🛠️ Comandos Comunes

### Desarrollo

```bash
make up                 # levanta Docker (dev + db)
make migrate-up         # aplica migraciones
pnpm dev               # o: tsx watch src/server.ts (sin Docker)
pnpm format            # formatea código
pnpm typecheck         # comprueba tipos
pnpm lint              # eslint + prettier
```

### Testing

```bash
make test              # vitest watch + UI (http://localhost:51204) en contenedor aislado
make test-ci           # corre tests una sola vez (modo CI) en contenedor aislado
pnpm test              # corre tests local (si tienes Postgres)
pnpm test:watch        # modo watch
```

### Build & Deploy

```bash
pnpm build            # compila src/ → dist/
pnpm start            # ejecuta dist/server.js (producción)
docker build .        # construye imagen prod
```

---

## 📝 Ejemplo: Agregar Nueva Feature

Digamos que quieres agregar un recurso `products`.

### 1. Crear tipos (en `src/shared/types.ts`)

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

### 2. Crear carpeta feature

```bash
mkdir -p src/features/products
```

### 3. Crear los 5 archivos

**`src/features/products/product.repository.ts`** (acceso a datos)

```typescript
import type { Queryable, Product } from "../../shared/types.js";

export async function findAll(pg: Queryable): Promise<Product[]> {
  const { rows } = await pg.query("SELECT id, name, price, created_at FROM products");
  return (rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price), // numeric de Postgres llega como string
    createdAt: new Date(row.created_at),
  }));
}
```

**`src/features/products/product.service.ts`** (lógica de negocio)

```typescript
import * as productRepository from "./product.repository.js";
import type { Queryable, Product } from "../../shared/types.js";

export async function getProducts(pg: Queryable): Promise<Product[]> {
  return productRepository.findAll(pg);
}
```

**`src/features/products/product.controller.ts`** (HTTP)

```typescript
import * as productService from "./product.service.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";
import type { listProductsSchema } from "./product.schema.js";

export async function listProducts(
  request: ZodRequest<typeof listProductsSchema>,
  reply: ZodReply<typeof listProductsSchema>,
): Promise<void> {
  const products = await productService.getProducts(request.server.pg);
  reply.send(products.map((p) => ({ id: p.id, name: p.name })));
}
```

**`src/features/products/product.schema.ts`** (validación + docs)

```typescript
import { z } from "zod";

export const listProductsSchema = {
  tags: ["products"],
  summary: "Listar productos",
  response: {
    200: z.array(z.object({ id: z.uuid(), name: z.string() })),
  },
};
```

**`src/features/products/product.routes.ts`** (endpoints)

```typescript
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as controller from "./product.controller.js";
import { listProductsSchema } from "./product.schema.js";

export default async function productRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get("/products", { schema: listProductsSchema }, controller.listProducts);
}
```

### 4. Registrar en `src/app.ts`

```typescript
import productRoutes from "./features/products/product.routes.js";

export async function build(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  // ...
  await fastify.register(productRoutes);
  return fastify;
}
```

### 5. Crear migración

```bash
pnpm migrate:create add_products_table
```

Edita `migrations/<timestamp>_add_products_table.ts`:

```typescript
import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("products", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    name: { type: "varchar(255)", notNull: true },
    price: { type: "numeric(10,2)", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("products");
};
```

Aplícala:

```bash
pnpm migrate:up
```

### 6. Escribir test (opcional)

```typescript
// test/products.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./setup.js";

describe("products", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /products returns empty array", async () => {
    const res = await app.inject({ method: "GET", url: "/products" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
```

---

## 🔐 Autenticación

Todas las rutas con `preHandler: [fastify.authenticate]` requieren un `Authorization: Bearer <jwt>` válido.

El JWT se obtiene de:

1. `POST /auth/google` (login con Google)
2. `POST /auth/refresh` (renovar después de expirar)

Prueba en `rest/auth.rest` (con extensión REST Client de VSCode).

---

## 🌍 Variables de Entorno

Copia `.env.example` a `.env` y personaliza:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
GOOGLE_CLIENT_ID=<tu-client-id>.apps.googleusercontent.com
JWT_SECRET=<una-string-larga-aleatoria-min-32-chars>
JWT_EXPIRES_IN=1h
```

`db` es el nombre del servicio Postgres en Docker Compose. Si ejecutas `pnpm dev` sin Docker, usa `localhost:5435` (puerto publicado por `docker-compose.yml`) o la URL de tu propio Postgres.

Todas están validadas en `src/config/index.ts` con Zod (`.env.example` documenta también las opcionales: `CORS_ORIGIN`, `AUTH_RATE_LIMIT_MAX`, `STRICT_SSL`...).

---

## 🐛 Troubleshooting

### "Module not found" en tests

→ Los imports relativos llevan extensión `.js` aunque el archivo sea `.ts` (ver la convención en `ARCHITECTURE.md`). Sin extensión, `tsc` da el error TS2835.

### "Cannot find module ... .js" al cargar plugins

→ No cargues plugins con `@fastify/autoload`: usa `import()` nativo de Node, que no mapea `.js` a `.ts`. Regístralos con imports estáticos en `src/app.ts`.

### TypeError: Cannot use import statement outside a module

→ Asegúrate de que `"type": "module"` está en `package.json`.

### TypeScript error en migraciones

→ Los scripts `migrate:*` ejecutan `node-pg-migrate` con `--tsx`, que carga las migraciones `.ts` directamente. Si lo lanzas a mano, añade `--tsx`.

### Docker build falla en redes corporativas

→ Define `STRICT_SSL=false` en `.env` y en `docker build --build-arg STRICT_SSL=false`.

---

## 📚 Documentación

- **Este archivo** → primeros pasos
- **`README.md`** → descripción técnica, scripts, decisiones
- **`ARCHITECTURE.md`** → patrones, estructura de features, convención de imports, ejemplo completo
- **`rest/*.rest`** → peticiones de ejemplo (extensión REST Client de VSCode)
- **`src/types/fastify.d.ts`** → tipos de Fastify y decoradores

---

## 🎯 Próximos Pasos

1. **Clona este repo** como base para tu proyecto
2. **Cambia** `package.json` name y fields
3. **Crea** tu primera feature (ej: `products`)
4. **Escribe tests** conforme desarrollas
5. **Deploya** con `docker build --target prod`

---

## 🤝 Contribuciones / Feedback

Este es un template pensado para **tu equipo**. Siéntete libre de:

- Cambiar la estructura de carpetas si prefieres
- Agregar más plugins de Fastify
- Adaptar la estrategia de testing

¡Feliz codeo! 🚀
