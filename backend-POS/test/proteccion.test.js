// Protección: una prueba nunca abre una base fuera de la carpeta temporal
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raiz = path.join(__dirname, '..');

// Carga config/database.js en un proceso aparte con el entorno indicado
function cargarBase(entorno) {
  return spawnSync(process.execPath, ['-e', "require('./src/config/database')"], {
    cwd: raiz,
    env: { ...process.env, ...entorno },
    encoding: 'utf8',
  });
}

test('en una prueba, una base fuera de la carpeta temporal falla antes de abrirse', () => {
  const fuera = path.join(raiz, 'test', 'no-debe-crearse.db');
  const r = cargarBase({ NODE_TEST_CONTEXT: 'child-v8', DB_PATH: fuera });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Las pruebas no pueden abrir una base fuera de la carpeta temporal/);
  assert.equal(fs.existsSync(fuera), false, 'no se creó el archivo');
});

test('la marca POS_PRUEBAS de helpers.js también activa la protección', () => {
  const fuera = path.join(raiz, 'test', 'tampoco-debe-crearse.db');
  const env = { POS_PRUEBAS: '1', DB_PATH: fuera };
  const r = spawnSync(process.execPath, ['-e', "require('./src/config/database')"], {
    cwd: raiz,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), ...env },
    encoding: 'utf8',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /fuera de la carpeta temporal/);
  assert.equal(fs.existsSync(fuera), false);
});

test('helpers.js deja la base temporal lista al cargarse, antes de cualquier módulo', () => {
  require('./helpers');
  const temporal = path.resolve(require('os').tmpdir()).toLowerCase();
  assert.ok(path.resolve(process.env.DB_PATH).toLowerCase().startsWith(temporal));
  assert.equal(process.env.POS_PRUEBAS, '1');
});
