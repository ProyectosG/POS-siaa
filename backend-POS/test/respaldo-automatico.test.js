// Respaldo automático al confirmar un Corte Z. El reloj se fija para probar días y semanas.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3');
const { iniciar, detener, api, login, dbGet, abrirCaja, sembrarCajas, crearProducto, vender, USUARIOS } = require('./helpers');

let db;
let baseUrl;
let producto;
let respaldos;
let fechas;
const t = {};
const cj = {};
const DIR = () => process.env.BACKUP_DIR;

const automaticos = () => (fs.existsSync(DIR()) ? fs.readdirSync(DIR()).filter((f) => f.startsWith('pos_auto_')).sort() : []);
const vaciar = () => { for (const f of automaticos()) fs.rmSync(path.join(DIR(), f), { force: true }); };
const configurar = (body) => api('PUT', '/api/settings', { token: t.admin, body });

// Las fechas se fijan a mediodía del negocio (Ciudad de México)
const alDia = (fecha) => fechas.fijarReloj(new Date(`${fecha}T18:00:00Z`));

async function ventaYZ(n = '1') {
  await vender(t.gerente, cj[n], producto, 10);
  const r = await api('POST', '/api/cuts', { token: t.gerente, caja: cj[n], body: { type: 'Z' } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r;
}

// Cuántas ventas trae una copia
async function ventasEn(archivo) {
  const c = new sqlite3.Database(path.join(DIR(), archivo), sqlite3.OPEN_READONLY);
  const { n } = await dbGet(c, 'SELECT COUNT(*) n FROM sales');
  await new Promise((r) => c.close(r));
  return n;
}

before(async () => {
  ({ db, baseUrl } = await iniciar());
  respaldos = require('../src/utils/respaldos');
  fechas = require('../src/utils/fechas');
  t.cajero = await login('cajero');
  t.gerente = await login('gerente');
  t.admin = await login('admin');
  await sembrarCajas(t.gerente);
  for (const n of ['1', '2']) cj[n] = await abrirCaja(t.gerente, n);
  producto = await crearProducto(t.admin, { precio: 10, stock: 1000 });
});

beforeEach(() => {
  fechas.fijarReloj(null);
  vaciar();
});

after(async () => {
  fechas.fijarReloj(null);
  await detener();
});

test('nace apagado y, apagado, el Z no respalda', async () => {
  const s = await api('GET', '/api/settings', { token: t.admin });
  assert.equal(s.data.respaldo_auto, 0);
  assert.equal(s.data.respaldo_periodo, 'diario');
  const r = await ventaYZ();
  assert.equal(r.data.respaldo, undefined);
  assert.deepEqual(automaticos(), []);
});

test('se validan los valores y solo el Administrador los cambia', async () => {
  assert.equal((await configurar({ respaldo_periodo: 'mensual' })).status, 400);
  assert.equal((await configurar({ respaldo_auto: 5 })).status, 400);
  assert.equal((await api('PUT', '/api/settings', { token: t.gerente, body: { respaldo_auto: 1 } })).status, 403);
  // El último resultado no se puede escribir desde afuera
  await configurar({ respaldo_ultimo_nombre: 'falso.db', respaldo_ultimo_error: 'falso' });
  const fila = await dbGet(db, 'SELECT respaldo_ultimo_nombre n, respaldo_ultimo_error e, respaldo_auto a FROM settings WHERE id = 1');
  assert.notEqual(fila.n, 'falso.db');
  assert.notEqual(fila.e, 'falso');
  assert.equal(fila.a, 0);
});

test('diario: dos Z el mismo día dejan un archivo, con lo último', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  alDia('2026-11-04');
  const r1 = await ventaYZ('1');
  assert.deepEqual(r1.data.respaldo, { ok: true, nombre: 'pos_auto_diario_2026-11-04.db' });
  const antes = await ventasEn('pos_auto_diario_2026-11-04.db');

  await ventaYZ('2');
  assert.deepEqual(automaticos(), ['pos_auto_diario_2026-11-04.db']);
  assert.equal(await ventasEn('pos_auto_diario_2026-11-04.db'), antes + 1);

  alDia('2026-11-05');
  await ventaYZ('1');
  assert.deepEqual(automaticos(), ['pos_auto_diario_2026-11-04.db', 'pos_auto_diario_2026-11-05.db']);

  const fila = await dbGet(db, 'SELECT respaldo_ultimo_nombre n, respaldo_ultimo_fecha f, respaldo_ultimo_bytes b, respaldo_ultimo_error e FROM settings WHERE id = 1');
  assert.equal(fila.n, 'pos_auto_diario_2026-11-05.db');
  assert.match(fila.f, /^2026-11-05 \d{2}:\d{2}:\d{2}$/);
  assert.ok(fila.b > 0);
  assert.equal(fila.e, null);
});

test('semanal: el mismo archivo de lunes a domingo y uno nuevo a la semana siguiente', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'semanal' });
  alDia('2026-11-02'); // lunes
  const r = await ventaYZ('1');
  assert.equal(r.data.respaldo.nombre, 'pos_auto_semanal_2026-11-02.db');
  alDia('2026-11-08'); // domingo
  await ventaYZ('2');
  assert.deepEqual(automaticos(), ['pos_auto_semanal_2026-11-02.db']);
  alDia('2026-11-09'); // lunes siguiente
  await ventaYZ('1');
  assert.deepEqual(automaticos(), ['pos_auto_semanal_2026-11-02.db', 'pos_auto_semanal_2026-11-09.db']);
});

test('la semana y el día salen de la zona del negocio, no de UTC', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  // Lunes 3 AM en UTC todavía es domingo en Ciudad de México
  fechas.fijarReloj(new Date('2026-11-09T03:00:00Z'));
  const r = await ventaYZ('1');
  assert.equal(r.data.respaldo.nombre, 'pos_auto_diario_2026-11-08.db');
  await configurar({ respaldo_periodo: 'semanal' });
  const s = await ventaYZ('1');
  assert.equal(s.data.respaldo.nombre, 'pos_auto_semanal_2026-11-02.db');
});

test('un Z General respalda una sola vez; un X General no respalda', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  await configurar({ respaldo_auto: 0 });
  await ventaYZ('1');
  await ventaYZ('2');
  await configurar({ respaldo_auto: 1 });

  const copias = respaldos.copiasHechas();
  const xg = await api('POST', '/api/cuts/general', { token: t.admin, body: { type: 'X' } });
  assert.equal(xg.status, 201);
  assert.equal(xg.data.respaldo, undefined);
  assert.equal(respaldos.copiasHechas(), copias);

  const zg = await api('POST', '/api/cuts/general', { token: t.admin, body: { type: 'Z' } });
  assert.equal(zg.status, 201);
  assert.equal(zg.data.respaldo.ok, true);
  assert.equal(respaldos.copiasHechas(), copias + 1);
  assert.equal(automaticos().length, 1);
});

test('la limpieza conserva 30 diarios y 12 semanales, y respeta los otros archivos', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  fs.mkdirSync(DIR(), { recursive: true });
  const dia = (i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
  for (let i = 0; i < 35; i++) fs.writeFileSync(path.join(DIR(), `pos_auto_diario_${dia(i)}.db`), 'x');
  for (let i = 0; i < 15; i++) fs.writeFileSync(path.join(DIR(), `pos_auto_semanal_${dia(i * 7)}.db`), 'x');
  const ajenos = ['pos_respaldo_2025-01-01_000000_000.db', 'pos_antes_x_1.db', 'pos_backup_1.db', 'pos_auto_diario_raro.db', 'notas.txt'];
  for (const f of ajenos) fs.writeFileSync(path.join(DIR(), f), 'x');

  alDia('2026-11-04');
  await ventaYZ('1');

  const archivos = fs.readdirSync(DIR());
  const diarios = archivos.filter((f) => /^pos_auto_diario_\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  const semanales = archivos.filter((f) => f.startsWith('pos_auto_semanal_')).sort();
  assert.equal(diarios.length, 30);
  assert.equal(diarios[29], 'pos_auto_diario_2026-11-04.db');
  assert.equal(diarios[0], `pos_auto_diario_${dia(6)}.db`); // se fueron los más viejos
  assert.equal(semanales.length, 12);
  for (const f of ajenos) assert.ok(archivos.includes(f), f);
  for (const f of ajenos) fs.rmSync(path.join(DIR(), f), { force: true });
});

test('si el respaldo falla, el Z no se deshace: lo avisa y queda anotado', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  const real = process.env.BACKUP_DIR;
  const comoArchivo = path.join(os.tmpdir(), `pos-test-archivo-${process.pid}`);
  fs.writeFileSync(comoArchivo, 'no soy carpeta');
  process.env.BACKUP_DIR = path.join(comoArchivo, 'dentro');
  let r;
  try {
    r = await ventaYZ('1');
  } finally {
    process.env.BACKUP_DIR = real;
    fs.rmSync(comoArchivo, { force: true });
  }

  assert.equal(r.status, 201);
  assert.equal(r.data.respaldo.ok, false);
  assert.ok(r.data.respaldo.error);
  assert.doesNotMatch(r.data.respaldo.error, /pos-test/); // sin rutas del servidor
  assert.equal((await dbGet(db, 'SELECT type FROM cuts WHERE id = ?', [r.data.id])).type, 'Z');
  const s = await api('GET', '/api/settings', { token: t.admin });
  assert.ok(s.data.respaldo_ultimo_error);

  // El siguiente que sale bien borra el error
  const bien = await ventaYZ('1');
  assert.equal(bien.data.respaldo.ok, true);
  assert.equal((await api('GET', '/api/settings', { token: t.admin })).data.respaldo_ultimo_error, null);
});

test('una copia dañada nunca reemplaza a la buena y no deja temporales', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  alDia('2026-11-04');
  await ventaYZ('1');
  const nombre = 'pos_auto_diario_2026-11-04.db';
  const buenas = await ventasEn(nombre);

  const original = respaldos.verificar;
  respaldos.verificar = async () => { throw new Error('La copia no pasó la revisión: prueba'); };
  let r;
  try {
    r = await ventaYZ('1');
  } finally {
    respaldos.verificar = original;
  }
  assert.equal(r.status, 201);
  assert.equal(r.data.respaldo.ok, false);
  assert.equal(await ventasEn(nombre), buenas);
  assert.deepEqual(automaticos(), [nombre]);
  assert.equal(fs.readdirSync(DIR()).some((f) => f.includes('.tmp-')), false);
});

test('la lista y la descarga: solo Administrador y SuperDeveloper; un Cajero recibe 403', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  alDia('2026-11-04');
  await ventaYZ('1');
  fechas.fijarReloj(null);
  const nombre = 'pos_auto_diario_2026-11-04.db';

  for (const token of [t.cajero, t.gerente]) {
    assert.equal((await api('GET', '/api/settings/respaldos', { token })).status, 403);
    assert.equal((await api('GET', `/api/settings/respaldos/${nombre}`, { token })).status, 403);
  }

  const lista = await api('GET', '/api/settings/respaldos', { token: t.admin });
  assert.equal(lista.status, 200);
  assert.equal(lista.data[0].nombre, nombre);
  assert.equal(lista.data[0].periodo, 'diario');
  assert.ok(lista.data[0].bytes > 0);

  const bajar = async (token, archivo) => fetch(`${baseUrl}/api/settings/respaldos/${archivo}`, { headers: { Authorization: `Bearer ${token}` } });
  const res = await bajar(t.admin, nombre);
  assert.equal(res.status, 200);
  assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 15).toString(), 'SQLite format 3');

  const sd = await api('POST', '/api/superdev/entrar', { body: { nickname: 'superdev', password: 'clave-super-de-prueba' } });
  const resSd = await bajar(sd.data.token, nombre);
  assert.equal(resSd.status, 200);
  await resSd.arrayBuffer();

  // Solo archivos automáticos: otros nombres y rutas no salen
  fs.writeFileSync(path.join(DIR(), 'pos_respaldo_2025-01-01_000000_000.db'), 'x');
  for (const malo of ['pos_respaldo_2025-01-01_000000_000.db', '..%2F..%2F.env', '..%5C..%5C.env', 'pos_auto_diario_2020-01-01.db']) {
    const r = await bajar(t.admin, malo);
    assert.equal(r.status, 404, malo);
    await r.arrayBuffer();
  }
  fs.rmSync(path.join(DIR(), 'pos_respaldo_2025-01-01_000000_000.db'), { force: true });
});

test('un Cajero no ve el último resultado del respaldo en la configuración', async () => {
  const s = await api('GET', '/api/settings', { token: t.cajero });
  assert.equal(s.status, 200);
  assert.equal('respaldo_ultimo_nombre' in s.data, false);
  assert.equal('respaldo_ultimo_error' in s.data, false);
});

// Los pasos de docs/RESTAURAR-RESPALDO.md, de verdad: otra base, otro proceso
test('restaurar: una copia en otra carpeta arranca la app y abre con esos datos', async () => {
  await configurar({ respaldo_auto: 1, respaldo_periodo: 'diario' });
  alDia('2026-11-04');
  const z = await ventaYZ('1');
  fechas.fijarReloj(null);
  const nombre = z.data.respaldo.nombre;
  const esperadas = await ventasEn(nombre);
  const ultimoCorte = z.data.id;
  const version = (await dbGet(db, 'PRAGMA user_version')).user_version;

  // Lo que pasa DESPUÉS del respaldo no debe aparecer en la base restaurada
  await vender(t.gerente, cj['1'], producto, 10);

  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-test-restaurar-'));
  const restaurada = path.join(carpeta, 'pos.db');
  fs.copyFileSync(path.join(DIR(), nombre), restaurada);

  const puerto = await new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
  const hijo = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    env: {
      ...process.env,
      NODE_TEST_CONTEXT: undefined,
      NODE_OPTIONS: undefined,
      DB_PATH: restaurada,
      BACKUP_DIR: path.join(carpeta, 'backups'),
      PORT: String(puerto),
    },
  });
  const url = `http://127.0.0.1:${puerto}`;
  try {
    let listo = false;
    for (let i = 0; i < 80 && !listo; i++) {
      try { listo = (await fetch(`${url}/health`)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
    assert.ok(listo, 'la app arrancó con la base restaurada');

    const u = USUARIOS.admin;
    const entrar = await fetch(`${url}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: u.nickname, password: u.password }),
    });
    assert.equal(entrar.status, 200);
    const { token } = await entrar.json();
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const ventas = await (await fetch(`${url}/api/sales`, auth)).json();
    assert.equal(ventas.length, esperadas);
    const corte = await (await fetch(`${url}/api/cuts/${ultimoCorte}`, auth)).json();
    assert.equal(corte.type, 'Z');

    const c = new sqlite3.Database(restaurada, sqlite3.OPEN_READONLY);
    assert.equal((await dbGet(c, 'PRAGMA user_version')).user_version, version);
    await new Promise((r) => c.close(r));
  } finally {
    hijo.kill();
    await new Promise((r) => hijo.once('exit', r));
    try { fs.rmSync(carpeta, { recursive: true, force: true }); } catch { /* Windows puede tardar en soltarla; se limpia en la siguiente corrida */ }
  }
});
