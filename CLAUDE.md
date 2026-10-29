# CLAUDE.md — POS-siaa

Punto de venta independiente. Backend en `backend-POS/` (Express 5 + sqlite3, sin ORM). Frontend en `frontend-pos/` (Next 16 + React 19 + Tailwind 4 + Zustand). Solo hay datos de **prueba**. El repositorio en GitHub es **público**.

## Reglas del proyecto

- Responder y comentar el código en **español**. Commits pequeños y claros, en español.
- Trabajar en ramas; **nunca** hacer push sin que el dueño lo pida. Nunca reescribir la historia de git ni hacer push forzado.
- **Sin pull requests** (desde el 2026-10-29): cuando una rama está lista y el dueño dice "sí, fusiona", respaldar antes los `.db`, juntarla con `main` con `git merge --no-ff` y la descripción completa en el mensaje del commit, y subir `main`. **Nunca fusionar sin que lo diga.**
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

- **Centavos**: el dinero se guarda en la base en centavos enteros. El API sigue hablando en pesos: se convierte al entrar (`aCentavos`) y al salir (`filaAPesos`, `filasAPesos`, `camposAPesos`) con `backend-POS/src/utils/dinero.js`. Toda cuenta de dinero se hace en centavos. **Una columna de dinero nueva va en `CAMPOS_DINERO`** y se convierte al leer y escribir. Desde la migración 4 las columnas de dinero son `INTEGER` en la base (en `schema.prisma` se quedan `Float`: el `Int` de Prisma es de 32 bits).
- **El servidor calcula el dinero**: la venta recibe producto, cantidad, `tipo_precio` (menudeo/mayoreo/especial/oferta), `discount_pct`, pagos y `total_esperado`; precios, descuentos (con `allow_discounts` y `max_discount_without_auth`), IVA incluido (16 % si el producto tiene `iva`), total, cambio y saldo salen de `utils/precios.js`. Si `total_esperado` no coincide: **409** sin registrar nada. Los cortes también calculan sus montos en el servidor. Nunca aceptar montos del navegador.
- **Transacciones**: todo lo que mueve dinero o inventario (ventas, abonos, entradas, salidas, cortes, saldo de clientes) va dentro de `enTransaccion` (`src/config/transaccion.js`): una transacción interactiva de Prisma (`$transaction`, espera para entrar de 15 s); el adaptador forma en espera todo lo demás, así que nunca se mezclan dos. Los modelos que escriben reciben `tx` (el cliente de Prisma de esa transacción): `Sale.crear`, `SaleDetail.crearVarios`, `Payment.crearVarios`, `Customer.moverSaldo`, `Entry.crear`, `Out.crear`, `Cut.crear`, `Product.crear`, `Kardex.registrarVarios(movimientos, tx)`. El stock se lee y descuenta dentro de la transacción. Los errores esperados se lanzan como `ErrorNegocio(status, mensaje)`.
- **Idempotencia**: `POST /sales`, `/apartados/abono`, `/entries` y `/outs` exigen el encabezado `Idempotency-Key` (`utils/idempotencia.js`, tabla `idempotencia`). La misma clave del mismo usuario devuelve la primera respuesta (`repetida: true`) sin registrar otra vez. En el frontend: `enviarOperacion(ruta, body, claveRef)` de `src/lib/apiFetch.js`, con un `useRef` por pantalla.
- **Fechas**: el servidor pone fecha y hora de cada movimiento con `ahoraNegocio()` (`utils/fechas.js`), en `TZ_NEGOCIO` (por omisión `America/Mexico_City`). No usar `new Date()`, `toISOString()` ni fechas del navegador. `created_at` (de SQLite) está en UTC: para mostrar, usar `date` y `time`.
- **Saldo de clientes**: `current_balance` es lo que el cliente debe. Sube con lo pendiente de un apartado o crédito y baja con cada abono; siempre con `Customer.moverSaldo`, que deja historial.
- **Abonos**: `POST /api/apartados/abono` cobra **apartados y créditos** del mismo cliente (nunca contado); la ruta conserva su nombre. El pago queda con `payment_type = 'abono'` y entra en el corte de su día. Pantalla: Registro de Abonos.
- **Precio libre**: en el menú de precios (tecla P) está "Precio libre (con clave)". `POST /api/settings/validar-clave-precio { clave, product_id, precio }` devuelve una autorización de 5 minutos para ese producto, precio y usuario (5 claves equivocadas → 15 min de bloqueo). La venta solo acepta el precio libre con esa autorización y marca el renglón (`sale_details.precio_libre`).
- **Migraciones**: `src/config/migraciones.js`, versionadas con `PRAGMA user_version`, cada una en una transacción y con respaldo previo (`VACUUM INTO` en `BACKUP_DIR`) si la base tiene datos. Un cambio de datos nuevo es una migración nueva, nunca un cambio a una que ya corrió.
- **Probar módulos sueltos**: cargar cualquier archivo del backend abre la base con el `.env` real y crea `src/pos.db` vacía si no existe. Siempre con `DB_PATH` apuntando a un archivo temporal.
- **Pruebas y la base real**: cada prueba carga `test/helpers.js` primero (prepara la base temporal al cargarse) y nunca carga un módulo del servidor antes. `config/database.js` lo protege: en las pruebas (`NODE_TEST_CONTEXT` o `POS_PRUEBAS`) falla de inmediato si la base no está en la carpeta temporal (`test/proteccion.test.js`).
- **Git y la base local**: el `pos_backup_*.db` sigue versionado en commits viejos de `main`. Cambiar a uno de esos commits y regresar BORRA la copia local (git la trata como archivo ignorado). Respaldarla antes de cualquier checkout a historia vieja.

## Diseño del frontend: cómo funciona hoy (rama `responsive-estetica`)

- **Colores en un solo lugar**: `frontend-pos/src/app/globals.css` define `--primario` (azul, acciones), `--exito` (verde, cobros y pagado), `--aviso` (ámbar, pendientes) y `--error` (rojo, SOLO errores y borrar), cada uno con su `-suave` para fondos. Se usan como clases de Tailwind (`bg-primario`, `text-exito`, `bg-aviso-suave`, `border-error`…), además de `shadow-suave` y `rounded-tarjeta`. No poner colores a mano (`emerald-600`, `#16a34a`…) en pantallas nuevas.
- **Tema claro**; el menú lateral sigue oscuro.
- **Anchos**: menú lateral fijo desde 1024 px (`lg`); abajo de eso, barra superior con botón ☰ y menú deslizable. Contado y apartado: apiladas en celular con la barra fija del total (`BarraTotalMovil`), productos a la izquierda y ticket a la derecha en tableta (`md`) y en pantallas ≥1536 px (`2xl`); entre 1024 y 1535 se apilan (con el menú fijo no caben las dos columnas).
- **Nunca desplazamiento lateral de la página**: las tablas anchas van dentro de un recuadro `tabla-desplazable overflow-x-auto` (el `Table` de `components/ui/table.jsx` ya lo trae) o en tarjetas en celular (`md:hidden` / `hidden md:block`). En una cuadrícula, la columna lleva `min-w-0`.
- **Botones de al menos 44 px** (regla global en `globals.css`; los interruptores conservan su forma y tienen un área de toque invisible).
- **Montos**: `pesos(v)` de `src/lib/formato.js` ($1,234.50) y la clase `monto` (derecha, números tabulares). Las exportaciones (Excel, PDF, TXT) siguen con números sin formato.
- **Piezas comunes** (`components/ui`): `EncabezadoPantalla` (título, subtítulo, icono y acciones; toda pantalla nueva lo usa), `EtiquetaTipoVenta` / `EtiquetaEstadoVenta`, `ListaVacia`, `Esqueleto` / `EsqueletoFilas` (mientras carga).
- **Auditoría**: en la revisión con Edge se miden las pantallas de `/dashboard` en 360, 768 y 1280 px: sin desplazamiento lateral, nada cortado y ningún botón de menos de 44 px.

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

- **Historial de códigos de barras**: la tabla `codigo_barras_historial` existe pero nada la llena; cambiar el código de un producto no deja rastro.
- **No hay pantalla de venta a crédito**: el menú solo tiene contado y apartado; un crédito hoy solo se crea por el API (`POST /api/sales` con `type: 'credito'`). Falta decidir quién vende a crédito, si hay límite por cliente y si se pide anticipo.

- **Reimprimir un corte viejo**: en Reporte de Cortes el botón de imprimir solo muestra un aviso; no hay ruta (`printCorteById` se quitó porque no tenía ruta y fallaba). Si se necesita, crear `GET /api/cuts/:id/print`.
- "Saldos y stocks a cero" del reset pone el stock en 0 sin kardex (es una herramienta del SuperDeveloper).
- Los intentos del SuperDeveloper y de la clave de precios se guardan en memoria: se reinician si se reinicia el servidor.
- El `pos_backup_*.db` sigue en la historia de git (repo público). Si hiciera falta borrarlo de la historia, sería una reescritura que el dueño tendría que autorizar.
- **Borrar una familia** borra una por una sus categorías: si una subfamilia tiene productos, las vacías sí se borran y la familia queda a medias (ya pasaba antes, sin aviso; ahora la pantalla dice cuál no se pudo). Para hacerlo todo o nada: una ruta `DELETE /api/categories/familia/:nombre` en una transacción.

## Fase 3 — Prisma (hecha por tandas: `fase3-prisma`, `fase3-catalogos`, `fase3-productos`, `fase3-lecturas`, `fase3-transacciones`)

Cómo funciona hoy:
- **Todo el servidor usa Prisma** mientras atiende, con **una sola conexión** (adaptador `@prisma/adapter-libsql`). `sqlite3` solo se usa al **arrancar** (crear tablas, migraciones, convertir contraseñas) y esa conexión se cierra antes de atender la primera petición (`db.cerrarArranque()` en `server.js`).
- `prisma/schema.prisma` salió de `prisma db pull` sobre una copia migrada. **Las migraciones siguen siendo de `config/migraciones.js`**: nunca usar `prisma migrate` ni `prisma db push`. Si una migración cambia tablas, volver a correr `db pull` sobre una copia temporal (con `DB_PATH`, nunca la base real) y **volver a aplicar los ajustes a mano**: fechas como `String` y dinero como `Float` (ver los comentarios al inicio del esquema).
- `npm run prisma:generar` genera el cliente (TypeScript) y lo compila a JavaScript en `src/generated/prisma-js` (`tsconfig.prisma.json`). Corre solo después de `npm install`. `src/generated/` no va a git.
- **Versiones fijas — regla**: `prisma`, `@prisma/client` y `@prisma/adapter-libsql` van en **7.10.1 exacto** en `package.json` (sin `^` ni `~`). **No actualizarlos sin volver a correr `test/carga.test.js` y las pruebas de transacciones** (`ventas`, `credito`, `fase2`, `productos`, `prisma`): `config/prisma.js` hace que las transacciones usen la misma conexión (`PrismaLibSqlUnaConexion`) y eso depende de cómo usa el adaptador al cliente en esa versión. Si una versión nueva lo rompe, puede volver a abrir una conexión por transacción (más lento) o fallar.
- **Modo WAL** (`PRAGMA journal_mode = WAL` al arrancar, queda en el archivo) con `synchronous` en FULL: confirmar cada operación cuesta mucho menos y ante un apagón protege igual. Junto a `pos.db` aparecen `pos.db-wal` y `pos.db-shm` (fuera de git). **Con el servidor encendido no se copia `pos.db` a mano** (podría quedar sin las últimas ventas): los respaldos de la app usan `VACUUM INTO` (consistente); a mano, solo con el servidor apagado.
- **Rendimiento medido** (`test/carga.test.js`, 128 operaciones a la vez): ~1.4 s, igual que el código con sqlite3. libsql ejecuta SQLite en el hilo de Node: en una ráfaga así otra petición puede esperar ~0.6 s (con sqlite3 era ~0.1 s); con pocas cajas no se nota.
- **Migraciones nuevas**: 3 (`autorizaciones_usadas` con `jti NOT NULL`, para que Prisma la use) y 4 (dinero de `REAL` a `INTEGER`: reconstruye las tablas con las llaves foráneas apagadas, conserva índices y el contador de folios, se detiene si algún monto tiene decimales, y compara suma y conteo de cada columna antes y después). Una migración que reconstruye tablas lleva `sinLlavesForaneas: true`.
- **Plan B comprobado**: el código anterior (sin esta tanda) funciona sobre una base ya migrada (WAL, versión 4, dinero `INTEGER`): un Revert del PR no pierde datos.
- **Nombre del artículo en ventas**: el detalle y el ticket usan el nombre guardado en el renglón al vender (`Sale.renglones`); el del catálogo solo si el renglón no lo tiene.
- **Kardex**: no hay `POST /api/kardex`. `Kardex.logMovement`/`registrarVarios` exigen `tx`: el kardex solo se registra en la transacción que mueve el stock.
- **Productos**: borrar uno con movimientos responde 409 "desactívalo"; como toda alta deja kardex, los productos se desactivan (`activo`), no se borran. El formulario de alta no deja capturar stock: se da de alta en 0 y se surte con una entrada.
- **Fechas de registro como texto**: en `schema.prisma`, `created_at`, `updated_at` y `fecha` son `String` con `dbgenerated("CURRENT_TIMESTAMP")`. Al escribirlas a mano usar `ahoraUTC()`. No usar consultas crudas para leer fechas (les suman 6 horas).
- Errores de Prisma en los controladores (`utils/peticion.js`): `esDuplicado` (P2002) → 409; `tieneRelacionados` (P2003) → 409; `leerId`/`idEntero` para ids (Prisma no acepta texto); `numeroONulo` + `ErrorCampo` (→ 400) para números.
- **No usar `@prisma/adapter-better-sqlite3`**: con él, una consulta de otra petición se mete en una `$transaction` abierta y se pierde si esa transacción falla (comprobado).
- **Respaldar ahora** (`GET /api/superdev/respaldo`, solo SuperDeveloper, `utils/respaldos.js`): `VACUUM INTO` (seguro con el servidor encendido), revisa la copia (`quick_check` y misma versión) antes de entregarla, la descarga y deja una copia en `backups/` conservando solo los 10 manuales más recientes (`pos_respaldo_*`; los `pos_antes_*` y `pos_backup_*` no se tocan). CORS expone `Content-Disposition`.
- El reset del SuperDeveloper apaga las llaves foráneas solo para su transacción (`PRAGMA foreign_keys = OFF` justo antes; la conexión siguiente las tiene activas).
- Pruebas: `test/helpers.js` revisa la base con una conexión sqlite3 propia (el servidor ya cerró la suya). En Windows libsql a veces no suelta el archivo; las pruebas borran las bases temporales de corridas anteriores.
