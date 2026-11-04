# Restaurar un respaldo

Un respaldo es la base completa en un solo archivo `.db`. Restaurar es poner ese archivo en lugar de la base, **con el servidor apagado**. No hay pantalla para hacerlo, a propósito: reemplaza todos los datos.

Lo que se haya registrado después del respaldo se pierde.

## Qué archivo usar

Están en la carpeta de respaldos (`BACKUP_DIR`; por omisión `backend-POS/backups`):

| Archivo | De dónde sale |
| --- | --- |
| `pos_auto_diario_AAAA-MM-DD.db` | Respaldo automático del día, del último Corte Z. Se conservan 30. |
| `pos_auto_semanal_AAAA-MM-DD.db` | Respaldo automático de la semana (la fecha es el lunes). Se conservan 12. |
| `pos_respaldo_*.db` | "Respaldar ahora" del SuperDeveloper. |
| `pos_antes_*.db` | Antes de una migración. |
| `pos_backup_*.db` | Antes de un reset. |

Los automáticos también se descargan en **Configuración → Respaldo automático**.

> El respaldo vive en el mismo disco que la base: **no protege contra una falla del disco**. Descarga una copia a otro lugar con frecuencia. El archivo trae todos los datos del negocio: guárdalo en un lugar privado.

## En la computadora de la tienda (Windows)

Los pasos suponen `DB_PATH=./src/pos.db`. Si tu `.env` dice otra ruta, usa esa. Corre los comandos en PowerShell, dentro de `backend-POS`.

1. **Apaga el servidor** (Ctrl+C en su ventana). Sin esto la copia puede quedar mal.

2. **Guarda aparte la base actual**, por si hay que regresar. Si `pos.db-wal` o `pos.db-shm` no existen, esas líneas solo avisan:

   ```powershell
   New-Item -ItemType Directory -Force antes_de_restaurar
   Move-Item src\pos.db, src\pos.db-wal, src\pos.db-shm antes_de_restaurar\ -Force
   ```

   Es importante quitar `pos.db-wal` y `pos.db-shm`: son de la base anterior y no deben quedar junto a la restaurada.

3. **Copia el respaldo** en el lugar de la base (cambia el nombre por el del archivo que elegiste):

   ```powershell
   Copy-Item backups\pos_auto_diario_2026-11-04.db src\pos.db
   ```

4. **Arranca el servidor**:

   ```powershell
   npm start
   ```

   Si el respaldo es de una versión anterior, las migraciones corren solas al arrancar y hacen su propio respaldo antes.

5. **Comprueba**: entra con tu usuario y revisa la última venta en Lista de Ventas y el último corte en Reporte de Cortes. Las cajas abiertas siguen funcionando; si alguna pide elegir caja de nuevo, se abre otra vez.

Cuando todo esté bien, puedes borrar `antes_de_restaurar`.

## En Render

> Estos pasos no se probaron en Render, solo en local. Haz primero un ensayo con datos de prueba.

**La demo no se restaura.** Su base se borra y se vuelve a sembrar en cada arranque, y en `MODO_DEMO` no hay respaldos automáticos. El Blueprint de la demo (`render.yaml`) no cambia.

Para un servicio de la tienda en Render, los respaldos **tienen que estar en un disco persistente**. El disco normal del servicio se borra en cada despliegue y reinicio, y con él la base y los respaldos. Los discos persistentes de Render requieren un plan de pago.

1. Agrega un disco al servicio, montado por ejemplo en `/var/data`, y configura:

   ```
   DB_PATH=/var/data/pos.db
   BACKUP_DIR=/var/data/backups
   ```

2. Sube el respaldo al disco, por ejemplo a `/var/data/restaurar/respaldo.db`. Usa SSH o `scp`, que en Render dependen de que el servicio esté encendido.

3. Cambia temporalmente el **Start Command** para que reemplace la base antes de arrancar:

   ```bash
   mkdir -p /var/data/antes_de_restaurar && mv /var/data/pos.db* /var/data/antes_de_restaurar/ ; cp /var/data/restaurar/respaldo.db /var/data/pos.db && node server.js
   ```

4. Cuando el servicio arranque, comprueba los datos como en el paso 5 de arriba.

5. **Regresa el Start Command a `node server.js` de inmediato.** Si se queda, cada reinicio volvería a restaurar el respaldo y borraría lo registrado después.
