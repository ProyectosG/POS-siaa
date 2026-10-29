# CLAUDE.md — POS-siaa

Punto de venta independiente. Backend en `backend-POS/` (Express 5 + sqlite3, sin ORM). Frontend en `frontend-pos/` (Next 16 + React 19 + Tailwind 4 + Zustand). Solo hay datos de **prueba**. El repositorio en GitHub es **público**.

## Reglas del proyecto

- Responder y comentar el código en **español**. Commits pequeños y claros, en español.
- Trabajar en ramas; **nunca** hacer push sin que el dueño lo pida. Nunca reescribir la historia de git ni hacer push forzado.
- Si algo del plan no se puede hacer como está escrito, avisar antes de improvisar.
- Nunca versionar bases de datos (`*.db`), respaldos (`backups/`) ni `.env`.
- Puertos para pruebas locales: backend **5050**, frontend **3050**. Detener al terminar lo que se haya arrancado.
- Las pruebas del backend (`cd backend-POS && npm test`) deben quedar en verde, y `npm run build` del frontend sin errores.

## Seguridad: cómo funciona hoy (después de la Fase 0)

- **Autenticación**: `POST /api/users/login` entrega un JWT (12 h) con `id`, `nickname`, `access_level`, firmado con `JWT_SECRET`. El middleware `requireAuth` (`backend-POS/src/middleware/auth.js`) exige el token en todo `/api`, salvo `POST /api/users/login` y `POST /api/superdev/entrar`. `/health` es pública.
- **Roles** (en el servidor, con `requireLevel(NIVELES.X)` en cada archivo de rutas): Cajero 1, Supervisor 50, Gerente 90, Administrador 99. El SuperDeveloper pasa cualquier nivel.
- **No confiar en el cliente**: el usuario de ventas, entradas, salidas, kardex, productos y cortes sale de `req.user` (token), nunca del cuerpo.
- **Contraseñas**: bcrypt (`backend-POS/src/utils/seguridad.js`). Al arrancar se convierte a hash todo lo que esté en texto plano en `users.password`, `cash_registers.password` y `settings.dynamic_price_auth_key`. Ninguna respuesta devuelve contraseñas.
- **Actualizaciones dinámicas**: siempre con LISTA FIJA de campos (`CAMPOS_EDITABLES`) en `userController.update`, `Customer.update`, `Product.update` y `settings.model.update`. Si se agrega una columna editable, hay que agregarla a la lista.
- **Usuarios**: solo el Administrador cambia `access_level`; nadie cambia el suyo; no se puede borrar ni bajar al último Administrador.
- **SuperDeveloper**: `POST /api/superdev/entrar` con `SUPERDEV_USER` / `SUPERDEV_PASSWORD` de `.env` (comparación en tiempo constante, 5 intentos por IP y bloqueo de 15 min, en memoria). Token con `superdev: true` de 45 min. Sin esas variables queda apagado. `/api/reset/*` exige ese token y solo acepta las tablas de `TABLAS_PERMITIDAS` (`resetController.js`).
- **Clave para liberar precios**: no sale en `GET /api/settings`; se valida con `POST /api/settings/validar-clave-precio` `{ clave } → { valida }`; solo el Administrador la cambia (vacía = no cambia).
- **Frontend**: todas las llamadas al API pasan por `apiFetch` (`frontend-pos/src/lib/apiFetch.js`): toma `NEXT_PUBLIC_API_URL`, agrega `Authorization: Bearer <token>` y cierra la sesión si recibe 401. **No usar `fetch` directo contra el API.** El token vive en `useAuthStore`; la cookie `auth-token` solo la usa `src/middleware.js` para redirigir (lee el JWT sin verificar la firma, solo para decidir a dónde mandar; nunca da permisos).
- **Menú y pantallas por rol**: la tabla está en `frontend-pos/src/lib/permisos.js` (`puedeVer(user, ruta)`); la usan el menú lateral y `app/dashboard/layout.js`. Solo decide qué se muestra; debe coincidir con los `requireLevel` del servidor. Una pantalla nueva de `/dashboard` que no esté en la tabla queda solo para el Administrador: hay que agregarla.
- **Configuración**: `server.js` exporta la app y solo escucha si se corre directo. `DB_PATH`, `CORS_ORIGIN`, `JWT_SECRET`, `SUPERDEV_*`, `BACKUP_DIR`, `TZ_NEGOCIO` en `backend-POS/.env` (ver `.env.example`).
- **Pruebas**: `backend-POS/test/*.test.js` con `node --test`; `test/helpers.js` arranca la app sobre una base SQLite temporal sembrada con contraseñas en texto plano.

## Dinero e integridad: cómo funciona hoy (después de la Fase 1)

- **Centavos**: el dinero se guarda en la base en centavos enteros. El API sigue hablando en pesos: se convierte al entrar (`aCentavos`) y al salir (`filaAPesos`, `filasAPesos`, `camposAPesos`) con `backend-POS/src/utils/dinero.js`. Toda cuenta de dinero se hace en centavos. **Una columna de dinero nueva va en `CAMPOS_DINERO`** y se convierte al leer y escribir. Las columnas siguen declaradas `REAL` (cambiar el tipo exige reconstruir tablas; queda para Prisma), pero guardan enteros.
- **El servidor calcula el dinero**: la venta recibe producto, cantidad, `tipo_precio` (menudeo/mayoreo/especial/oferta), `discount_pct`, pagos y `total_esperado`; precios, descuentos (con `allow_discounts` y `max_discount_without_auth`), IVA incluido (16 % si el producto tiene `iva`), total, cambio y saldo salen de `utils/precios.js`. Si `total_esperado` no coincide: **409** sin registrar nada. Los cortes también calculan sus montos en el servidor. Nunca aceptar montos del navegador.
- **Transacciones**: todo lo que mueve dinero o inventario (ventas, abonos, entradas, salidas, cortes, saldo de clientes) va dentro de `enTransaccion` (`src/config/transaccion.js`): una conexión SQLite propia y una cola, una transacción a la vez. Los modelos que escriben reciben `tx` (`Sale.crear`, `SaleDetail.crear`, `Payment.crear`, `Customer.moverSaldo`, `Entry.crear`, `Out.crear`, `Cut.crear`, `Kardex.logMovement(datos, tx)`). El stock se lee y descuenta dentro de la transacción. Los errores esperados se lanzan como `ErrorNegocio(status, mensaje)`.
- **Idempotencia**: `POST /sales`, `/apartados/abono`, `/entries` y `/outs` exigen el encabezado `Idempotency-Key` (`utils/idempotencia.js`, tabla `idempotencia`). La misma clave del mismo usuario devuelve la primera respuesta (`repetida: true`) sin registrar otra vez. En el frontend: `enviarOperacion(ruta, body, claveRef)` de `src/lib/apiFetch.js`, con un `useRef` por pantalla.
- **Fechas**: el servidor pone fecha y hora de cada movimiento con `ahoraNegocio()` (`utils/fechas.js`), en `TZ_NEGOCIO` (por omisión `America/Mexico_City`). No usar `new Date()`, `toISOString()` ni fechas del navegador. `created_at` (de SQLite) está en UTC: para mostrar, usar `date` y `time`.
- **Saldo de clientes**: `current_balance` es lo que el cliente debe. Sube con lo pendiente de un apartado o crédito y baja con cada abono; siempre con `Customer.moverSaldo`, que deja historial.
- **Precio libre**: en el menú de precios (tecla P) está "Precio libre (con clave)". `POST /api/settings/validar-clave-precio { clave, product_id, precio }` devuelve una autorización de 5 minutos para ese producto, precio y usuario (5 claves equivocadas → 15 min de bloqueo). La venta solo acepta el precio libre con esa autorización y marca el renglón (`sale_details.precio_libre`).
- **Migraciones**: `src/config/migraciones.js`, versionadas con `PRAGMA user_version`, cada una en una transacción y con respaldo previo (`VACUUM INTO` en `BACKUP_DIR`) si la base tiene datos. Un cambio de datos nuevo es una migración nueva, nunca un cambio a una que ya corrió.
- **Probar módulos sueltos**: cargar cualquier archivo del backend abre la base con el `.env` real y crea `src/pos.db` vacía si no existe. Siempre con `DB_PATH` apuntando a un archivo temporal.
- **Git y la base local**: el `pos_backup_*.db` sigue versionado en commits viejos de `main`. Cambiar a uno de esos commits y regresar BORRA la copia local (git la trata como archivo ignorado). Respaldarla antes de cualquier checkout a historia vieja.

## Fase 0 — Seguridad (hecha, rama `fase0-seguridad`)

1. Base de datos fuera del repo (`git rm --cached`, `*.db` y `backups/` en `.gitignore`; la historia no se reescribió, el archivo viejo sigue en commits anteriores).
2. Contraseñas con bcrypt y conversión automática al arrancar (también claves de caja, a petición del dueño).
3. JWT en todo `/api`; `apiFetch` en el frontend (69 llamadas en 29 archivos).
4. Permisos por rol en el servidor; usuario tomado del token.
5. SuperDeveloper con credenciales de `.env`; se eliminó la clave por fecha y la cookie `is-superdev`. En el login hay un enlace "Acceso SuperDeveloper".
6. Listas fijas de campos contra inyección SQL; reset con lista fija de tablas.
7. Clave de precios con hash y validación en el servidor.
8. Lista de apartados: se buscaba `type = 'APARTADO'` y se guarda `'apartado'` (ahora `LOWER(type) = 'apartado'` y `pending_balance > 0`). El abono solo se acepta para un apartado del mismo cliente.
9. Fuera de los logs: cookies, cuerpo completo de ventas y detalle de abonos.
10. `server.js` exportable, `DB_PATH`, `CORS_ORIGIN`, pruebas con `node --test` (28 pruebas).
11. `.env.example` de backend y frontend; README.

Arreglos encontrados al revisar en el navegador:
- Catálogo de usuarios: un 403 ya no cierra la sesión (muestra "No tienes permiso").
- Venta de contado por código de barras: leía `p.existencia` pero el API devuelve `stock`, así que con "stock negativo" desactivado todo producto escaneado salía sin existencia (ya pasaba en `main`).

Menú por rol: cada usuario ve en el menú lateral solo lo que el servidor le permite (Cajero y Supervisor: ventas, abonos, estados de cuenta y corte X; Gerente: además catálogo sin usuarios, entradas, salidas, kardex, reportes y corte Z; Administrador: además usuarios y configuración; SuperDeveloper: todo, y es el único con Resetear Datos). Si alguien escribe a mano la dirección de una pantalla que no le toca, el layout de `/dashboard` muestra "No tienes permiso" sin cargarla. Se quitaron del menú los enlaces sin pantalla (Proveedores, Tickets, Seguridad, grupo Compras).

## Fase 1 — Integridad de ventas y dinero (hecha, rama `fase1-integridad`)

1. Dinero en centavos enteros, con migración versionada que respalda la base antes.
2. Cola de transacciones en una conexión propia: ventas, abonos, entradas, salidas y cortes son todo o nada; dos ventas no venden la misma última pieza.
3. El servidor calcula precios, descuentos, IVA, totales, cambio, saldos y cortes; 409 si el total que vio el cajero no coincide.
4. Idempotencia con `Idempotency-Key` en ventas, abonos, entradas y salidas (un doble clic registra una sola vez).
5. Una sola zona horaria (`TZ_NEGOCIO`, `America/Mexico_City`); el servidor pone las fechas.
6. Precio libre con la clave de precios (autorización de 5 min, límite de intentos).
7. Saldo de clientes = lo pendiente; la migración recalculó los saldos existentes y dejó el ajuste en el historial.

Arreglos encontrados en el camino: el ticket imprimía como anticipo el 30 % del total en vez de lo pagado; una entrada o salida con un producto inexistente dejaba la petición colgada; el corte X se guardaba sin `desde`/`hasta` y el Z con solo 3 de sus montos; la pantalla de abonos mostraba la hora en UTC.

## Fase 2 — Mantenimiento (hecha, rama `fase2-mantenimiento`)

1. **Cortes**: los cobros se cuentan por pago, no por el ticket de la venta. Cada corte guarda `last_payment_id` y el siguiente cuenta desde ahí; un abono a un apartado viejo entra en el corte de su día. Un corte con solo abonos se puede confirmar (`first_ticket` queda vacío y `last_ticket` conserva hasta dónde se cubrió). Migración 2.
2. **Stock solo por kardex**: `PUT /api/products/:id` ya no acepta `stock` (el formulario mandaba el stock que tenía al abrirse y borraba las ventas de en medio). El alta anota su stock inicial en el kardex, en una transacción. Ajustes: Entradas y Salidas con "Ajuste positivo/negativo".
3. **Imprimir corte**: `GET /api/cuts/print/current?tipo=X|Z&caja=` (Z solo Gerente o superior). Sin impresora responde 200 en "modo prueba" con el texto del ticket.
4. **Precio libre**: la autorización se usa una sola vez (tabla `autorizaciones_usadas`).
5. **Reset**: al borrar ventas, pagos, entradas o salidas también vacía `idempotencia` y `autorizaciones_usadas`.
6. Fuera los logs de depuración; quedan solo avisos de arranque, migraciones, respaldos y errores.
7. Fuera 38 dependencias del frontend que no se importaban (entre ellas los duplicados `sonner`, `react-modal` y `react-day-picker`; se usan `react-hot-toast`, Radix Dialog y `react-datepicker`). `react-dom` se queda porque Next lo necesita. Fuera `porsiacaso.initDatabase.js`, `scripts/sanitize_sales.js`, `1CustomerStatement` y `2CustomerStatement` (ese borrado quedó dentro del commit de cortes).

## Pendientes (sin hacer)

- **Reimprimir un corte viejo**: en Reporte de Cortes el botón de imprimir solo muestra un aviso; no hay ruta (`printCorteById` se quitó porque no tenía ruta y fallaba). Si se necesita, crear `GET /api/cuts/:id/print`.
- "Saldos y stocks a cero" del reset pone el stock en 0 sin kardex (es una herramienta del SuperDeveloper).
- Los intentos del SuperDeveloper y de la clave de precios se guardan en memoria: se reinician si se reinicia el servidor.
- El `pos_backup_*.db` sigue en la historia de git (repo público). Si hiciera falta borrarlo de la historia, sería una reescritura que el dueño tendría que autorizar.
- Las columnas de dinero siguen declaradas `REAL` aunque guardan centavos enteros.
- **Borrar una familia** borra una por una sus categorías: si una subfamilia tiene productos, las vacías sí se borran y la familia queda a medias (ya pasaba antes, sin aviso; ahora la pantalla dice cuál no se pudo). Para hacerlo todo o nada: una ruta `DELETE /api/categories/familia/:nombre` en una transacción.

## Fase 3 — Prisma (prueba de concepto hecha, rama `fase3-prisma`)

Cómo funciona hoy:
- **Prisma 7.10.1** (la 8 sigue en versión de prueba y su cliente no está publicado), adaptador **`@prisma/adapter-libsql`**. El backend sigue en JavaScript CommonJS.
- `prisma/schema.prisma` salió de `prisma db pull` sobre una copia migrada. **Las migraciones siguen siendo de `config/migraciones.js`**: nunca usar `prisma migrate` ni `prisma db push`. Si una migración cambia tablas, volver a correr `db pull` sobre una copia temporal (con `DB_PATH`, nunca la base real).
- `npm run prisma:generar` genera el cliente (TypeScript) y lo compila a JavaScript en `src/generated/prisma-js` (`tsconfig.prisma.json`). Corre solo después de `npm install`. `src/generated/` no va a git.
- `src/config/prisma.js` exporta `prisma`. Solo **Categorías** usa Prisma por ahora.

Reglas mientras Prisma conviva con sqlite3:
- **Toda consulta de modelo de Prisma pasa por la cola de transacciones** (`enCola` de `transaccion.js`, ya hecho con `$extends` en `config/prisma.js`). Motivo: mientras Prisma espera el candado de SQLite **detiene todo Node**; si eso pasa con una transacción de sqlite3 a medias, esa transacción ya no puede terminar y Prisma falla a los 5 s (comprobado).
- No usar `prisma.$transaction` ni consultas crudas (`$queryRaw`, `$executeRaw`) fuera de `config/prisma.js`: no pasan por la cola. No llamar a Prisma desde dentro de `enTransaccion`.
- **No usar `@prisma/adapter-better-sqlite3`**: con él, una consulta de otra petición se mete en una `$transaction` abierta y se pierde si esa transacción falla (comprobado). Con libsql la otra petición espera.
- En Windows libsql no suelta el archivo al desconectarse; las pruebas borran las bases temporales de corridas anteriores.

Lo que falta (si se sigue): pasar el resto de los modelos (catálogos y lecturas primero; al final ventas, abonos, entradas, salidas y cortes juntos, cambiando la cola por `$transaction` de Prisma con una sola conexión y una prueba de carga); `autorizaciones_usadas` quedó fuera del esquema porque su `jti` admite nulos (necesita una migración que lo haga `NOT NULL`); `created_at` de SQLite es texto UTC y hay que revisar cómo lo entrega Prisma. Si se descarta Prisma: pasar las columnas de dinero de `REAL` a `INTEGER` con una migración propia.
