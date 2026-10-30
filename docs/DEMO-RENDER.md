# Demo pública en Render

La demo es una copia aparte del POS con datos de prueba: una tienda de abarrotes con 30 productos, 10 clientes y dos semanas de ventas. **No es la tienda del cliente**: tiene su propio servicio, su propia base, su propio `JWT_SECRET` y no tiene SuperDeveloper.

## Cómo se comporta

- **Entrada:** usuario `demo` / contraseña `demo` (Administrador). Caja `1`, clave `demo`. El login y la selección de caja los muestran, con un botón "Usar estos datos".
- **Los datos se reinician en cada arranque.** El plan gratis de Render apaga el servicio tras unos 15 minutos sin visitas. La siguiente visita tarda entre 30 y 60 s en abrir y llega con los datos nuevos.
- **Bloqueado en el servidor** (responde 403 "No disponible en la demo"):
  - crear, editar o borrar usuarios (sí se pueden ver), y cambiar las cajas;
  - SuperDeveloper (entrar y respaldo) y Resetear datos;
  - guardar la Configuración y validar la clave de precios (no hay precio libre);
  - imprimir el ticket.
- **Sí funciona** todo lo demás: ventas, apartados, abonos, entradas, salidas, kardex, catálogos, cortes X y Z, reportes y la vista previa del ticket. Los cortes se ven en pantalla y no se imprimen.
- Sin `MODO_DEMO=1` (y sin `NEXT_PUBLIC_MODO_DEMO=1` en el frontend) nada de esto existe: la tienda funciona igual que siempre.

## Crear los servicios (una sola vez)

1. Fusiona la rama a `main` y súbela a GitHub. La demo se despliega desde `main`.
2. En Render, ve a **New → Blueprint**, elige el repositorio `ProyectosG/POS-siaa` y la rama `main`. Render lee `render.yaml` y propone dos servicios: `pos-siaa-demo-api` y `pos-siaa-demo-web`.
3. Te va a pedir dos valores (los marcados `sync: false`). Usa las URL que Render muestra para cada servicio:
   - `CORS_ORIGIN` (de `pos-siaa-demo-api`): la URL del frontend, por ejemplo `https://pos-siaa-demo-web.onrender.com`. Va sin `/` al final.
   - `NEXT_PUBLIC_API_URL` (de `pos-siaa-demo-web`): la URL de la API **con `/api` al final**, por ejemplo `https://pos-siaa-demo-api.onrender.com/api`.

   Si Render agrega letras al nombre (por ejemplo `pos-siaa-demo-api-x1y2.onrender.com`), usa la URL real. Si la capturaste mal, corrígela en **Environment**. En el frontend, después de corregirla, haz **Manual Deploy** (Next la lee al construir).
4. Pulsa **Apply**. Primero termina la API: en sus **Logs** debe aparecer `🧪 Demo sembrada…` y `MODO DEMO`. Luego termina el frontend.
5. Comprueba:
   - `https://<api>/health` responde `"demo": true`.
   - Abre la URL del frontend y entra con demo / demo y caja 1 / demo.

## Notas

- El `JWT_SECRET` lo genera Render. Nunca uses el del cliente ni copies su `.env`.
- Cada push a `main` vuelve a desplegar la demo (y sus datos se reinician).
- Si el build del frontend se queda sin memoria en el plan gratis, el log de Render lo dice ("JavaScript heap out of memory"). En ese caso se puede subir solo ese servicio a un plan de pago o construir con menos memoria. Avísame y lo vemos.
- Para probar la demo en tu computadora:
  - backend con `MODO_DEMO=1` y `DB_PATH=./demo/demo.db`;
  - frontend construido con `NEXT_PUBLIC_MODO_DEMO=1`.

  **Nunca pongas `MODO_DEMO=1` en el `.env` de la tienda.** Si lo pones, el servidor se niega a arrancar porque la base no se llama `demo.db`.
