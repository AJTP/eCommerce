# 🛒 E-commerce Completo - Ejercicio Nivel 2.5

## Objetivo

Implementar un **e-commerce funcional** con gestión de productos, carrito de compras, órdenes y reseñas de productos. Combina conceptos de **relaciones complejas**, **validaciones de negocio**, **transacciones** y **agregaciones en BD** (eliminando la necesidad del Nivel 3).

---

## 📋 Requisitos Generales

### Funcionalidad Core

- Administradores pueden crear/editar/listar productos
- Usuarios pueden ver todos los productos (lectura pública)
- Usuarios pueden **agregar productos a carrito** y **gestionar carrito**
- Usuarios pueden **crear órdenes** a partir de su carrito
- Usuarios pueden **dejar reseñas y comentarios** en productos
- Solo el autor de una reseña puede editarla o eliminarla
- Admin puede eliminar reseñas inapropiadas

### Stack

- TypeScript strict, Zod, PostgreSQL, patrón de capas
- Roles/autorización (admin, user)
- Transacciones para operaciones críticas (crear orden)
- Agregaciones y JOINs complejos

---

## 🗄️ Base de Datos

### Migraciones necesarias

Debes crear **5 tablas relacionadas**:

#### Tabla `products`

**Qué debe almacenar:**

- Información del producto (id, nombre, descripción, precio)
- Stock disponible
- Rating promedio (calculado o desnormalizado)
- Timestamps
- Quién lo creó (referencia al usuario admin)

**Consideraciones:**

- Precio decimal (¿cuántos decimales?)
- Stock >= 0 (CHECK constraint)
- Índices para búsqueda

#### Tabla `cart_items`

**Qué debe almacenar:**

- Relación usuario-producto
- Cantidad
- Timestamps

**Consideraciones:**

- UNIQUE(user_id, product_id) - un item por producto por carrito
- FK con ON DELETE CASCADE o ON DELETE SET NULL

#### Tabla `orders`

**Qué debe almacenar:**

- ID único del pedido
- Usuario que compró
- Monto total (snapshot del momento de compra)
- Estado (pending, completed, cancelled)
- Timestamps (creado)

**Consideraciones:**

- El total debe capturar precios del momento (¿copiar precios de products?)
- ¿Quién puede actualizar el estado? (solo admin)

#### Tabla `order_items`

**Qué debe almacenar:**

- Relación order-product
- Cantidad y precio unitario (snapshot del momento)

**Consideraciones:**

- Una orden puede tener múltiples items
- Almacenar precio unitario es importante para auditoría

#### Tabla `product_reviews`

**Qué debe almacenar:**

- ID de la reseña
- Usuario que la escribió
- Producto que reseña
- Rating (1-5)
- Título
- Contenido (texto largo)
- Timestamps (creado, editado)

**Consideraciones:**

- Un usuario solo puede tener 1 reseña por producto (UNIQUE)
- El rating se usa para calcular promedio de producto
- Índices para búsqueda rápida por producto

---

## 📌 Tipos de Dominio

### Agrega a `src/shared/types.ts` cuatro interfaces:

#### `Product`

- Todos los campos de tabla products (camelCase)
- Rating promedio (¿calculado dinámicamente o almacenado?)

#### `CartItem`

- Usuario, producto, cantidad, timestamps

#### `Order`

- Usuario, estado, total, timestamps
- Relación con order_items

#### `OrderItem`

- Producto, cantidad, precio unitario (snapshot)

#### `ProductReview`

- Usuario (autor), producto, rating, título, contenido
- Timestamps

---

## ⚠️ Excepciones Personalizadas

### `src/features/products/exceptions.ts`

- Producto no encontrado
- Stock insuficiente
- No autorizado (no admin)
- Datos inválidos (precio negativo, rating fuera de rango)

### `src/features/cart/exceptions.ts`

- Producto no en carrito
- Cantidad inválida
- Stock agotado

### `src/features/orders/exceptions.ts`

- Orden no encontrada
- Carrito vacío
- No autorizado
- Orden ya procesada

### `src/features/reviews/exceptions.ts`

- Reseña no encontrada
- Ya existe reseña del usuario para este producto
- Rating inválido (fuera de 1-5)
- Contenido vacío
- No autorizado (no autor ni admin)

---

## 🔐 Validación con Zod

### `src/features/products/product.schema.ts`

1. **GET /products** (público)
   - Listar con filtros (nombre, rango precio)
   - Paginación
   - Retorna rating promedio

2. **POST /products** (admin)
   - Body: nombre, descripción, precio, stock
   - Validaciones: precio > 0, stock >= 0

3. **GET /products/:id** (público)
   - Incluir rating, cantidad de reseñas

4. **PATCH /products/:id** (admin)
   - Actualizar campos (precio, stock, descripción)

5. **DELETE /products/:id** (admin)
   - Soft delete o hard delete

### `src/features/reviews/review.schema.ts`

1. **GET /products/:id/reviews** (público)
   - Listar reseñas del producto
   - Paginación
   - Ordenar por fecha (reciente primero)

2. **POST /products/:id/reviews** (autenticado)
   - Body: rating (1-5), título, contenido
   - Validar que usuario no tenga reseña previa

3. **PATCH /products/:id/reviews/:reviewId** (autor o admin)
   - Actualizar rating, título, contenido

4. **DELETE /products/:id/reviews/:reviewId** (autor o admin)
   - Eliminar reseña

### `src/features/cart/cart.schema.ts`

1. **GET /cart** (autenticado)
   - Ver carrito actual

2. **POST /cart/items** (autenticado)
   - Agregar producto
   - Validar stock

3. **PATCH /cart/items/:productId** (autenticado)
   - Actualizar cantidad

4. **DELETE /cart/items/:productId** (autenticado)
   - Quitar item

### `src/features/orders/order.schema.ts`

1. **POST /orders** (autenticado)
   - Crear orden a partir del carrito
   - Vaciar carrito automáticamente
   - Body: vacío (usa carrito actual)

2. **GET /orders** (autenticado)
   - Listar mis órdenes
   - Incluir items de cada orden

3. **GET /orders/:id** (autenticado)
   - Ver detalles de una orden
   - Con items y precios snapshot
   - Validar que es mi orden

4. **PATCH /orders/:id** (admin)
   - Actualizar estado (pending → completed, etc.)
   - Solo admin puede cambiar estado

---

## 🗂️ Acceso a Datos (Repository)

### `src/features/products/product.repository.ts`

- Obtener todos (con filtros/paginación)
- Obtener uno
- Crear
- Actualizar
- Eliminar
- ¿Contar reseñas por producto?
- ¿Calcular rating promedio?

### `src/features/reviews/review.repository.ts`

- Obtener reseñas de un producto (paginadas)
- Obtener una reseña por ID
- Crear reseña
- Actualizar reseña
- Eliminar reseña
- ¿Verificar si usuario ya reseñó?

### `src/features/cart/cart.repository.ts`

- Obtener carrito de usuario (con detalles de productos)
- Agregar item
- Actualizar cantidad
- Eliminar item
- Limpiar carrito (vaciar todo)

### `src/features/orders/order.repository.ts`

- Obtener órdenes de un usuario
- Obtener una orden por ID
- Crear orden (con transacción?)
- Crear order_items (para cada item del carrito)
- Actualizar estado de orden
- Obtener detalles de orden con items

---

## 🧠 Lógica de Negocio (Service)

### `src/features/products/product.service.ts`

- Listar con filtros
- Obtener producto
- Crear (validar admin)
- Actualizar (validar admin)
- Eliminar (validar admin)

### `src/features/reviews/review.service.ts`

- Listar reseñas de producto (paginadas)
- Obtener reseña
- Crear reseña
  - Validar que usuario no tenga reseña previa
  - Validar rating 1-5
  - Validar contenido no vacío
  - Actualizar rating promedio de producto
- Actualizar reseña (validar autor)
- Eliminar reseña (validar autor o admin)
  - Recalcular rating promedio de producto

### `src/features/cart/cart.service.ts`

- Ver carrito
- Agregar al carrito (validar stock)
- Actualizar cantidad (validar stock)
- Quitar del carrito

### `src/features/orders/order.service.ts`

- Listar órdenes del usuario
- Obtener orden (validar propiedad)
- Crear orden
  - Validar carrito no esté vacío
  - **Transacción:** crear order + order_items + vaciar carrito
  - Capturar precios del momento
  - ¿Decrementar stock de productos?
- Actualizar estado (validar admin)

---

## 🌐 Handlers HTTP (Controller)

### `src/features/products/product.controller.ts`

- Listar (GET)
- Obtener (GET)
- Crear (POST - admin)
- Actualizar (PATCH - admin)
- Eliminar (DELETE - admin)

### `src/features/reviews/review.controller.ts`

- Listar reseñas (GET)
- Crear reseña (POST)
- Actualizar reseña (PATCH)
- Eliminar reseña (DELETE)

### `src/features/cart/cart.controller.ts`

- Ver carrito (GET)
- Agregar (POST)
- Actualizar (PATCH)
- Quitar (DELETE)

### `src/features/orders/order.controller.ts`

- Listar órdenes (GET)
- Obtener orden (GET)
- Crear orden (POST)
- Actualizar estado (PATCH - admin)

---

## 🛣️ Rutas y Endpoints

### Products

| Método | Ruta            | Auth     | Descripción          |
| ------ | --------------- | -------- | -------------------- |
| GET    | `/products`     | ❌       | Listar (con filtros) |
| GET    | `/products/:id` | ❌       | Obtener              |
| POST   | `/products`     | ✅ Admin | Crear                |
| PATCH  | `/products/:id` | ✅ Admin | Actualizar           |
| DELETE | `/products/:id` | ✅ Admin | Eliminar             |

### Reviews (anidadas en products)

| Método | Ruta                              | Auth | Descripción            |
| ------ | --------------------------------- | ---- | ---------------------- |
| GET    | `/products/:id/reviews`           | ❌   | Listar reseñas         |
| POST   | `/products/:id/reviews`           | ✅   | Crear reseña           |
| PATCH  | `/products/:id/reviews/:reviewId` | ✅   | Editar (autor/admin)   |
| DELETE | `/products/:id/reviews/:reviewId` | ✅   | Eliminar (autor/admin) |

### Cart

| Método | Ruta                     | Auth | Descripción         |
| ------ | ------------------------ | ---- | ------------------- |
| GET    | `/cart`                  | ✅   | Ver mi carrito      |
| POST   | `/cart/items`            | ✅   | Agregar             |
| PATCH  | `/cart/items/:productId` | ✅   | Actualizar cantidad |
| DELETE | `/cart/items/:productId` | ✅   | Quitar              |

### Orders

| Método | Ruta          | Auth     | Descripción               |
| ------ | ------------- | -------- | ------------------------- |
| GET    | `/orders`     | ✅       | Listar mis órdenes        |
| GET    | `/orders/:id` | ✅       | Ver detalle               |
| POST   | `/orders`     | ✅       | Crear orden (del carrito) |
| PATCH  | `/orders/:id` | ✅ Admin | Cambiar estado            |

---

## 📝 Registrar en la Aplicación

### `src/app.ts`

- Importar y registrar rutas de: products, reviews, cart, orders

---

## ✅ Tests de Integración

### `test/products.test.ts` - 20+ tests

**GET /products**

- [ ] Listar productos
- [ ] Filtrar por nombre
- [ ] Filtrar por precio
- [ ] Paginación
- [ ] Incluye rating promedio

**POST /products** (admin)

- [ ] Crear producto
- [ ] Error 403 si no admin
- [ ] Error 400 si precio/stock negativo

**GET /products/:id**

- [ ] Obtener producto
- [ ] Incluye rating, cantidad reseñas
- [ ] Error 404 si no existe

**PATCH /products/:id** (admin)

- [ ] Actualizar
- [ ] Error 403 si no admin
- [ ] `updated_at` cambia

**DELETE /products/:id** (admin)

- [ ] Eliminar
- [ ] Error 403

### `test/reviews.test.ts` - 25+ tests

**GET /products/:id/reviews**

- [ ] Listar reseñas públicamente
- [ ] Paginación
- [ ] Ordenar por fecha

**POST /products/:id/reviews**

- [ ] Crear reseña con rating + contenido
- [ ] Error 400 si rating fuera de 1-5
- [ ] Error 400 si contenido vacío
- [ ] Error 409 si usuario ya reseñó
- [ ] Error 401 sin token

**PATCH /products/:id/reviews/:reviewId**

- [ ] Actualizar reseña (autor)
- [ ] Error 403 si no eres autor ni admin
- [ ] Error 404 si no existe
- [ ] `updated_at` cambia

**DELETE /products/:id/reviews/:reviewId**

- [ ] Eliminar (autor o admin)
- [ ] Error 403 si no eres autor ni admin
- [ ] Reseña desaparece

**Rating dinámico**

- [ ] Rating promedio se actualiza al crear/eliminar reseña
- [ ] Múltiples reseñas → promedio correcto

### `test/cart.test.ts` - 15+ tests

**GET /cart**

- [ ] Ver carrito vacío
- [ ] Ver carrito con items
- [ ] Incluye detalles de productos
- [ ] Solo tu carrito

**POST /cart/items**

- [ ] Agregar producto
- [ ] Error 404 si producto no existe
- [ ] Error 400 si stock insuficiente
- [ ] Si ya está, ¿suma o reemplaza? (define y testea)

**PATCH /cart/items/:productId**

- [ ] Actualizar cantidad
- [ ] Error 400 si cantidad <= 0
- [ ] Si cantidad es 0, se elimina

**DELETE /cart/items/:productId**

- [ ] Quitar item
- [ ] Retorna 204

### `test/orders.test.ts` - 20+ tests

**GET /orders**

- [ ] Ver mis órdenes
- [ ] No ver órdenes de otros usuarios
- [ ] Incluye items de cada orden

**GET /orders/:id**

- [ ] Ver detalles de mi orden
- [ ] Error 404 si no existe
- [ ] Error 403 si no es mía

**POST /orders**

- [ ] Crear orden del carrito
- [ ] Carrito se vacía automáticamente
- [ ] Order captura precios del momento
- [ ] Error 400 si carrito vacío
- [ ] Orden tiene estado "pending"
- [ ] Order items tiene cantidad y precio unitario (snapshot)

**PATCH /orders/:id** (admin)

- [ ] Cambiar estado (pending → completed)
- [ ] Error 403 si no admin
- [ ] `updated_at` cambia

**Transacción:**

- [ ] Si falla crear items, no se vacía carrito
- [ ] Crear orden es atómico

---

## 🔧 Ficheros REST

### `rest/products.rest`

- Listar
- Crear (admin)
- Obtener
- Actualizar
- Filtros

### `rest/reviews.rest`

- Listar reseñas de un producto
- Crear reseña
- Editar reseña
- Eliminar reseña
- Ver rating promedio actualizado

### `rest/cart.rest`

- Ver carrito
- Agregar items
- Actualizar cantidad
- Quitar items
- Intentar agregar más stock

### `rest/orders.rest`

- Crear orden
- Listar mis órdenes
- Ver detalle de orden
- Cambiar estado (admin)

---

## 📚 Orden Recomendado

1. **Migraciones** (products, cart_items, orders, order_items, product_reviews)
2. **Tipos** en `src/shared/types.ts`
3. **Excepciones** (products, reviews, cart, orders)
4. **Schemas Zod** (todos)
5. **Repository** (products, reviews, cart, orders)
6. **Service** (products, reviews, cart, orders)
7. **Controller** (todos)
8. **Routes** (todos) + registrar en `app.ts`
9. **Tests**
10. **Ficheros REST**

---

## ✔️ Checklist Final

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm lint` limpio
- [ ] `pnpm test` todos en verde (80+ tests)
- [ ] Documentación en `/reference`
- [ ] Todos los endpoints probados
- [ ] Autorización: admin CRUD productos, usuario puede reseñar
- [ ] Transacción en crear orden
- [ ] Rating promedio se actualiza correctamente
- [ ] Cada usuario solo ve su carrito y sus órdenes
- [ ] Snapshot de precios en order_items
- [ ] Sin `any` innecesario

---

## 💡 Conceptos Clave

| Concepto                        | Implementa en                                   |
| ------------------------------- | ----------------------------------------------- |
| Relaciones complejas (N:N, N:1) | Reviews, Orders, CartItems                      |
| JOINs                           | Ver carrito, ver detalles orden, contar reseñas |
| Agregaciones                    | Rating promedio de producto                     |
| Autorización granular           | Autor reseña, admin ordenes, admin productos    |
| Soft delete                     | Opcional: marcar orden como cancelled           |
| Transacciones                   | Crear orden atómicamente                        |
| Snapshot de datos               | Precios en order_items (no varían)              |
| Uniqueness                      | Usuario no puede duplicar reseña/item carrito   |

---

## 🚀 Bonus

- Búsqueda full-text en productos
- Filtrar por rating mínimo
- Historial de precios
- Descuentos/cupones
- Envío (costo, dirección)
- Pagos (simulado o Stripe)
- Notificaciones de cambio de orden
