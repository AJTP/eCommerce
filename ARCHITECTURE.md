# Arquitectura del Proyecto

Este documento explica la estructura del proyecto y cómo agregar nuevas features.

## 📂 Estructura General

```
src/
├── features/              # Features (módulos de negocio)
├── shared/                # Código compartido
├── plugins/               # Plugins de Fastify
├── config/                # Configuración centralizada
├── types/                 # Declaraciones de tipos (fastify.d.ts)
├── app.ts                 # Factory de la aplicación
└── server.ts              # Punto de entrada

migrations/                # Migraciones de node-pg-migrate (TypeScript)
templates/                 # Plantilla para `pnpm migrate:create`
test/                      # Tests de integración (Vitest)
```

---

## 📋 Descripción de Carpetas

### `src/features/` - Features del Negocio

Cada feature es un módulo independiente con su propia lógica de negocio. Ejemplo: `auth`, `users`, `products`.

**Estructura de un feature:**

```
features/
├── auth/
│   ├── auth.controller.ts          # Manejadores de requests HTTP
│   ├── auth.routes.ts              # Definición de endpoints
│   ├── auth.schema.ts              # Validaciones (schemas Zod)
│   ├── identity.repository.ts      # Acceso a datos: identidades
│   ├── identity.service.ts         # Lógica de negocio: identidades
│   ├── refresh-token.repository.ts # Acceso a datos: refresh tokens
│   ├── token.service.ts            # Lógica de negocio: tokens
│   └── exceptions.ts               # Errores específicos de auth
├── users/
│   ├── user.controller.ts
│   ├── user.routes.ts
│   ├── user.schema.ts
│   ├── user.repository.ts
│   ├── user.service.ts
│   └── exceptions.ts
├── health/
│   └── health.routes.ts
└── providers/
    └── google.ts                   # Integraciones externas
```

### `src/shared/` - Código Compartido

Código reutilizable entre features.

- **`exceptions/app-exception.ts`** - Clase base para todas las excepciones personalizadas
- **`schemas/common.schema.ts`** - Schemas Zod comunes (`errorResponseSchema`)
- **`fastify-types.ts`** - Tipos `ZodRequest`/`ZodReply` para tipar controllers a partir del schema de la ruta
- **`types.ts`** - Tipos/interfaces compartidas (User, Identity, RefreshToken, OAuthProfile, Queryable)
- **`utils/`** - Funciones utilitarias (futuro)

### `src/plugins/` - Plugins de Fastify

Extensiones y middlewares de Fastify.

- **`db.ts`** - Conexión a PostgreSQL
- **`jwt.ts`** - Autenticación con JWT
- **`cors.ts`** - CORS configuration
- **`rate-limit.ts`** - Rate limiting
- **`authorization.ts`** - Verificación de permisos
- **`swagger.ts`** - Documentación OpenAPI
- **`error-handler.ts`** - Manejo centralizado de errores

### `src/config/` - Configuración

- **`index.ts`** - Variables de entorno validadas con **Zod** (tipadas con Config interface)

### `src/types/` - Declaraciones de Tipos

- **`fastify.d.ts`** - Augmentación de módulos para Fastify, FastifyJWT y variables de entorno

### Archivos Raíz

- **`src/app.ts`** - Factory que construye la instancia de Fastify: registra los compiladores de Zod, los plugins (en orden explícito) y las rutas de cada feature
- **`src/server.ts`** - Punto de entrada: inicia la app

### Convención de imports (`.js` en archivos `.ts`)

El proyecto es ESM con `moduleResolution: NodeNext`, que exige extensión en los imports relativos. Se escribe siempre `.js`, aunque el archivo real sea `.ts`: TypeScript, `tsx` y Vitest lo resuelven al `.ts` y `tsc` emite `.js` en `dist/`.

```typescript
import config from "../config/index.js"; // ✅ aunque exista config/index.ts
import config from "../config/index"; //    ❌ error TS2835
import config from "../config/index.ts"; //  ❌ requiere allowImportingTsExtensions
```

Por eso los plugins se registran explícitamente en `app.ts` (y no con `@fastify/autoload`, que usa `import()` nativo de Node y no entiende `.ts` bajo Vitest).

---

## 🔄 Flujo de un Request

```
Request HTTP
    ↓
auth.routes.ts         (define ruta + schema)
    ↓
auth.controller.ts     (parsea request, maneja respuesta)
    ↓
identity.service.ts    (lógica de negocio)
    ↓
identity.repository.ts (acceso a base de datos)
    ↓
PostgreSQL
    ↓
Response JSON
```

---

## 🎯 Responsabilidades de Cada Capa

### Controller (`.controller.ts`)

**Responsabilidad:** Manejar la lógica HTTP (request/response). Request y reply se tipan a partir del schema Zod de la ruta con `ZodRequest`/`ZodReply` (`src/shared/fastify-types.ts`), sin casts.

```typescript
// src/features/auth/auth.controller.ts
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";
import type { googleLoginSchema } from "./auth.schema.js";

export async function googleLogin(
  request: ZodRequest<typeof googleLoginSchema>,
  reply: ZodReply<typeof googleLoginSchema>,
): Promise<void> {
  const { id_token: idToken } = request.body; // Tipado e inferido del schema Zod

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized", message: "Invalid Google token" });
    return;
  }

  const user = await identityService.findOrCreateUserFromIdentity(request.server.pg, profile);

  const accessToken = await reply.jwtSign({ id: user.id, email: user.email });
  // El serializer de Zod comprueba que la respuesta cumple el schema del status
  reply.status(200).send({ accessToken, refreshToken, user: toUserResponse(user) });
}
```

**Tareas:**

- ✅ Extraer datos del request (`request.body`, `request.params`, etc.)
- ✅ Llamar a servicios con lógica de negocio
- ✅ Manejar errores y retornar códigos HTTP apropiados
- ✅ Formatear y enviar la respuesta
- ✅ Tipar argumentos y retorno

### Service (`.service.ts`)

**Responsabilidad:** Lógica de negocio y orquestación de datos.

```typescript
// src/features/users/user.service.ts
import type { Queryable, User } from "../../shared/types.js";
import { UserNotFoundError } from "./exceptions.js";
import * as userRepository from "./user.repository.js";

export async function getUserById(pg: Queryable, userId: string): Promise<User> {
  const user = await userRepository.findById(pg, userId);
  if (!user) {
    throw new UserNotFoundError(userId); // Lanzar excepción
  }
  return user;
}

export async function createUser(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  // Validaciones de negocio (ejemplo)
  if (!userData.email) {
    throw new Error("Email is required");
  }

  return userRepository.create(pg, userData);
}
```

**Tareas:**

- ✅ Aplicar reglas de negocio
- ✅ Validar datos (lógica de negocio, no entrada)
- ✅ Orquestar múltiples repositorios
- ✅ Lanzar excepciones personalizadas
- ✅ Tipar argumentos, retornos y datos

### Repository (`.repository.ts`)

**Responsabilidad:** Acceso a datos. Cualquier operación con BD pasa por aquí.

```typescript
// src/features/users/user.repository.ts
import type { Queryable, User } from "../../shared/types.js";

export async function findById(pg: Queryable, userId: string): Promise<User | null> {
  const { rows } = await pg.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
    [userId],
  );
  const row = rows[0] as any;
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        createdAt: new Date(row.created_at),
      }
    : null;
}

export async function create(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  const { rows } = await pg.query(
    "INSERT INTO users (name, email, avatar_url) VALUES ($1, $2, $3) RETURNING id, name, email, avatar_url, created_at",
    [userData.name, userData.email, userData.avatarUrl],
  );
  const row = rows[0] as any;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
  };
}
```

**Tareas:**

- ✅ Ejecutar queries SQL
- ✅ Transformar resultados de BD en tipos del dominio
- ✅ No contiene lógica de negocio
- ✅ Tipar retornos

### Schema (`.schema.ts`)

**Responsabilidad:** Validar entrada y respuestas con **Zod** y documentar endpoints. Un único schema valida, tipa y genera el OpenAPI (vía `fastify-type-provider-zod`).

```typescript
// src/features/auth/auth.schema.ts
import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";
import { userResponseSchema } from "../users/user.schema.js";

export const googleLoginSchema = {
  tags: ["auth"],
  summary: "Login/registro con Google",
  description: "Verifica un id_token de Google...",
  body: z.object({ id_token: z.string().min(1) }),
  response: {
    200: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      user: userResponseSchema,
    }),
    401: errorResponseSchema,
  },
};
```

**Tareas:**

- ✅ Validar entrada del usuario (body, params, querystring)
- ✅ Validar/serializar la respuesta de cada status
- ✅ Documentar respuestas (Swagger) y obtener los tipos con `z.infer`

**Contrato de la API vs. dominio:** la API expone `snake_case` (`avatar_url`, `created_at`) y el dominio usa `camelCase`. `toUserResponse` (en `user.schema.ts`) hace la conversión antes de responder.

### Routes (`.routes.ts`)

**Responsabilidad:** Conectar endpoints con controllers.

```typescript
// src/features/auth/auth.routes.ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as authController from "./auth.controller.js";
import { googleLoginSchema, meSchema } from "./auth.schema.js";

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>(); // Activa los tipos de Zod

  fastify.post("/auth/google", { schema: googleLoginSchema }, authController.googleLogin);

  fastify.get(
    "/auth/me",
    { schema: meSchema, preHandler: [fastify.authenticate] },
    authController.getMe,
  );
}
```

**Tareas:**

- ✅ Definir método HTTP (GET, POST, etc.)
- ✅ Definir ruta
- ✅ Asociar schema de validación
- ✅ Asociar middlewares (autenticación, rate limit)
- ✅ Conectar con controller

### Exceptions (`.exceptions.ts`)

**Responsabilidad:** Excepciones personalizadas del feature, extienden AppException.

```typescript
// src/features/users/exceptions.ts
import { AppException } from "../../shared/exceptions/app-exception.js";

export class UserNotFoundError extends AppException {
  constructor(userId: string) {
    super(`User not found with id '${userId}'`, 404);
  }
}
```

---

## 🚀 Implementar una Nueva Feature

### Ejemplo: Agregar feature `products`

#### 1. Crear estructura de carpetas

```bash
mkdir -p src/features/products
cd src/features/products
```

#### 2. Crear tipos de dominio en `src/shared/types.ts` (si no existen)

Añade:

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

#### 3. Crear `product.repository.ts`

```typescript
// src/features/products/product.repository.ts
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

export async function findById(pg: Queryable, productId: string): Promise<Product | null> {
  const { rows } = await pg.query(
    "SELECT id, name, price, created_at FROM products WHERE id = $1",
    [productId],
  );
  const row = rows[0] as any;
  return row
    ? {
        id: row.id,
        name: row.name,
        price: Number(row.price), // numeric de Postgres llega como string
        createdAt: new Date(row.created_at),
      }
    : null;
}

export async function create(
  pg: Queryable,
  productData: { name: string; price: number },
): Promise<Product> {
  const { rows } = await pg.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price, created_at",
    [productData.name, productData.price],
  );
  const row = rows[0] as any;
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price), // numeric de Postgres llega como string
    createdAt: new Date(row.created_at),
  };
}
```

#### 4. Crear `exceptions.ts`

```typescript
// src/features/products/exceptions.ts
import { AppException } from "../../shared/exceptions/app-exception.js";

export class ProductNotFoundError extends AppException {
  constructor(productId: string) {
    super(`Product not found with id '${productId}'`, 404);
  }
}

export class InvalidPriceError extends AppException {
  constructor() {
    super("Price must be greater than 0", 400);
  }
}
```

#### 5. Crear `product.service.ts`

```typescript
// src/features/products/product.service.ts
import type { Queryable, Product } from "../../shared/types.js";
import * as productRepository from "./product.repository.js";
import { ProductNotFoundError, InvalidPriceError } from "./exceptions.js";

export async function getProducts(pg: Queryable): Promise<Product[]> {
  return productRepository.findAll(pg);
}

export async function getProductById(pg: Queryable, productId: string): Promise<Product> {
  const product = await productRepository.findById(pg, productId);
  if (!product) {
    throw new ProductNotFoundError(productId);
  }
  return product;
}

export async function createProduct(
  pg: Queryable,
  productData: { name: string; price: number },
): Promise<Product> {
  if (productData.price < 0) {
    throw new InvalidPriceError();
  }
  return productRepository.create(pg, productData);
}
```

#### 6. Crear `product.schema.ts`

```typescript
// src/features/products/product.schema.ts
import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";

export const productResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  price: z.number().min(0),
  created_at: z.iso.datetime(),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;

export const listProductsSchema = {
  tags: ["products"],
  summary: "Listar productos",
  response: { 200: z.array(productResponseSchema) },
};

export const getProductSchema = {
  tags: ["products"],
  summary: "Obtener un producto",
  params: z.object({ id: z.uuid() }),
  response: { 200: productResponseSchema, 404: errorResponseSchema },
};

export const createProductSchema = {
  tags: ["products"],
  summary: "Crear producto",
  body: z.object({ name: z.string().min(1), price: z.number().min(0) }),
  response: { 201: productResponseSchema, 400: errorResponseSchema },
};
```

Los tipos de `body`, `params` y de cada respuesta se infieren de estos schemas; no hace falta declarar interfaces a mano.

#### 7. Crear `product.controller.ts`

```typescript
// src/features/products/product.controller.ts
import * as productService from "./product.service.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";
import type { Product } from "../../shared/types.js";
import type {
  createProductSchema,
  getProductSchema,
  listProductsSchema,
  ProductResponse,
} from "./product.schema.js";

// Dominio (camelCase) -> contrato de la API (snake_case)
function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    created_at: product.createdAt.toISOString(),
  };
}

export async function listProducts(
  request: ZodRequest<typeof listProductsSchema>,
  reply: ZodReply<typeof listProductsSchema>,
): Promise<void> {
  const products = await productService.getProducts(request.server.pg);
  reply.send(products.map(toProductResponse));
}

export async function getProduct(
  request: ZodRequest<typeof getProductSchema>,
  reply: ZodReply<typeof getProductSchema>,
): Promise<void> {
  const product = await productService.getProductById(request.server.pg, request.params.id);
  reply.send(toProductResponse(product));
}

export async function createProduct(
  request: ZodRequest<typeof createProductSchema>,
  reply: ZodReply<typeof createProductSchema>,
): Promise<void> {
  const product = await productService.createProduct(request.server.pg, request.body);
  reply.status(201).send(toProductResponse(product));
}
```

#### 8. Crear `product.routes.ts`

```typescript
// src/features/products/product.routes.ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as productController from "./product.controller.js";
import { listProductsSchema, getProductSchema, createProductSchema } from "./product.schema.js";

export default async function productRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get("/products", { schema: listProductsSchema }, productController.listProducts);

  fastify.get("/products/:id", { schema: getProductSchema }, productController.getProduct);

  fastify.post(
    "/products",
    { schema: createProductSchema, preHandler: [fastify.authenticate] },
    productController.createProduct,
  );
}
```

#### 9. Registrar las rutas en `src/app.ts`

```typescript
// En src/app.ts, agregar (después de importar):
import productRoutes from "./features/products/product.routes.js";

// Y en la función build():
await fastify.register(productRoutes);
```

#### 10. Crear la migración

```bash
pnpm migrate:create add_products_table
```

Luego edita `migrations/<timestamp>_add_products_table.ts`:

```typescript
import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("products", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "varchar(255)", notNull: true },
    price: { type: "numeric(10,2)", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("products");
};
```

Aplica la migración:

```bash
pnpm migrate:up
```

#### 11. ¡Listo!

La feature está lista. Los endpoints estarán disponibles en:

- `GET /products` - Listar todos
- `GET /products/:id` - Obtener uno
- `POST /products` - Crear nuevo (requiere autenticación)

---

## 📝 Checklist para una Nueva Feature

- [ ] Crear carpeta `src/features/nombre/`
- [ ] Crear tipos en `src/shared/types.ts` (si es necesario)
- [ ] Crear `nombre.repository.ts` - Acceso a datos (tipado)
- [ ] Crear `nombre.service.ts` - Lógica de negocio (tipado)
- [ ] Crear `exceptions.ts` - Errores personalizados (extienden AppException)
- [ ] Crear `nombre.controller.ts` - Manejadores HTTP (tipados con ZodRequest/ZodReply)
- [ ] Crear `nombre.schema.ts` - Validaciones y docs (schemas Zod)
- [ ] Crear `nombre.routes.ts` - Definir endpoints (`app.withTypeProvider<ZodTypeProvider>()`)
- [ ] Registrar rutas en `src/app.ts` (await fastify.register)
- [ ] Crear migración (pnpm migrate:create) y aplicar (pnpm migrate:up)
- [ ] Escribir tests en `test/nombre.test.ts` (opcional pero recomendado)
- [ ] Crear `rest/nombre.rest` para pruebas manuales (opcional)

---

## 🔍 Patrones Comunes

### Manejar errores en controller

```typescript
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";
import type { createUserSchema } from "./user.schema.js";

export async function createUser(
  request: ZodRequest<typeof createUserSchema>,
  reply: ZodReply<typeof createUserSchema>,
): Promise<void> {
  try {
    const user = await userService.createUser(request.server.pg, request.body);
    reply.status(201).send(toUserResponse(user));
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      reply.status(400).send({ error: "Bad Request", message: err.message });
      return;
    }
    throw err; // Dejar que error-handler.ts lo maneje
  }
}
```

### Usar transacciones en service

```typescript
import type { PoolClient } from "pg";
import type { Queryable } from "../../shared/types.js";

export async function createUserWithProfile(
  pg: Queryable & { connect?(): Promise<PoolClient> },
  userData: { name: string; email: string; profileData: unknown },
): Promise<User> {
  const client = await (pg as any).connect();
  try {
    await client.query("BEGIN");

    const user = await userRepository.create(client as Queryable, userData);
    await profileRepository.create(client as Queryable, user.id, userData.profileData);

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

### Reutilizar schemas comunes

Los schemas Zod se componen como cualquier valor de TypeScript:

```typescript
// En product.schema.ts
import { z } from "zod";
import { userResponseSchema } from "../users/user.schema.js";

export const productWithOwnerSchema = productResponseSchema.extend({
  owner: userResponseSchema,
});
```

### Obtener el tipo a partir de un schema

```typescript
import { z } from "zod";

export const createProductBodySchema = z.object({ name: z.string().min(1), price: z.number() });

// Tipo inferido: { name: string; price: number }
export type CreateProductBody = z.infer<typeof createProductBodySchema>;
```
