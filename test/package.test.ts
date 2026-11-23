// El paquete tal como se publica: lo que trae el .tgz y que un proyecto lo puede importar con `import` y con
// `require()`. Corre con `npm run test:package`, no con `npm test`: compila, empaqueta e instala (unos segundos).

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';

const PAQUETE = JSON.parse(readFileSync('package.json', 'utf8'));
const SUELTOS = ['CHANGELOG.md', 'LICENSE', 'README.md', 'package.json'];

let temporal = '';
let archivos: string[] = [];

/** Corre `npm` en `cwd` sin ruido en la consola de la prueba; devuelve stdout. */
function npm(argumentos: string[], cwd = process.cwd()): string {
  return execFileSync('npm', argumentos, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** El resultado de `npm pack --json`: un arreglo hasta npm 11, un objeto por nombre de paquete desde npm 12. */
function empaquetado(argumentos: string[], cwd?: string): { filename: string; files: { path: string }[] } {
  const salida = JSON.parse(npm(['pack', '--json', '--ignore-scripts', ...argumentos], cwd));
  return Array.isArray(salida) ? salida[0] : Object.values<any>(salida)[0];
}

beforeAll(() => {
  temporal = mkdtempSync(join(tmpdir(), 'enrolamiento-paquete-'));
  npm(['run', 'build']);
  archivos = empaquetado(['--dry-run'])
    .files.map((archivo) => archivo.path)
    .sort();
}, 120000);

afterAll(() => {
  if (temporal) rmSync(temporal, { recursive: true, force: true });
});

test('el paquete trae solo dist/**, README.md, CHANGELOG.md, LICENSE y package.json', () => {
  const fuera = archivos.filter((ruta) => !ruta.startsWith('dist/') && !SUELTOS.includes(ruta));
  expect(fuera).toEqual([]);
  for (const ruta of [...SUELTOS, 'dist/index.js', 'dist/index.d.ts']) expect(archivos).toContain(ruta);
  for (const carpeta of ['src/', 'test/', 'contract/', 'scripts/']) {
    expect(archivos.filter((ruta) => ruta.startsWith(carpeta))).toEqual([]);
  }
});

test('cada archivo de dist sale de un .ts de src: nada viejo de un build anterior', () => {
  const fuentes = new Set(
    execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' })
      .split('\n')
      .filter((ruta) => ruta.endsWith('.ts')),
  );
  const huerfanos = archivos
    .filter((ruta) => ruta.startsWith('dist/'))
    .filter((ruta) => !fuentes.has(ruta.replace(/^dist\//, 'src/').replace(/(\.d)?\.js$|\.d\.ts$/, '.ts')));
  expect(huerfanos).toEqual([]);
});

test('los tipos publicados no exponen `pedir` ni `Operacion`', () => {
  for (const ruta of ['dist/index.d.ts', 'dist/client.d.ts']) {
    const texto = readFileSync(ruta, 'utf8');
    expect(texto, ruta).not.toMatch(/\bpedir\b/);
    expect(texto, ruta).not.toMatch(/\bOperacion\b/);
  }
});

test('sin dependencias de runtime', () => {
  expect(Object.keys(PAQUETE.dependencies ?? {})).toEqual([]);
  expect(Object.keys(PAQUETE.peerDependencies ?? {})).toEqual([]);
  expect(Object.keys(PAQUETE.optionalDependencies ?? {})).toEqual([]);
});

test('un proyecto que instala el .tgz lo carga con import y con require()', () => {
  const { filename } = empaquetado(['--pack-destination', temporal]);
  const proyecto = join(temporal, 'proyecto');
  mkdirSync(proyecto);
  writeFileSync(join(proyecto, 'package.json'), JSON.stringify({ name: 'prueba', private: true, type: 'module' }));
  npm(['install', join(temporal, filename), '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], proyecto);

  // Lo mismo por los dos caminos: la clase por omisión, los errores y `webhooks`.
  const comprobar = (modulo: string) => `
    const Enrolamiento = ${modulo}.default;
    const cliente = new Enrolamiento({ usuario: 'u', apikey: 'k', ambiente: ${modulo}.Ambiente.Homologacion });
    const errores = ['ErrorDeApi', 'ErrorDeAutenticacion', 'ErrorDeConexion', 'ErrorDeConfiguracion', 'ErrorDeFirma',
      'ErrorDeFramework', 'ErrorDeLimite', 'ErrorDeNegocio', 'ErrorDeTiempoAgotado'];
    const bien = typeof cliente.caf.descargar === 'function'
      && ${modulo}.Enrolamiento === Enrolamiento
      && !('pedir' in cliente)
      && typeof cliente.certificaciones.v1.consultar === 'function'
      && errores.every((nombre) => ${modulo}[nombre].prototype instanceof ${modulo}.EnrolamientoError)
      && typeof ${modulo}.webhooks.verificar === 'function'
      && typeof ${modulo}.VERSION_DEL_CONTRATO === 'string';
    console.log(bien ? 'ok' : 'mal');`;
  writeFileSync(join(proyecto, 'esm.mjs'), `import * as m from 'enrolamiento';\n${comprobar('m')}`);
  writeFileSync(join(proyecto, 'cjs.cjs'), `const m = require('enrolamiento');\n${comprobar('m')}`);
  writeFileSync(
    join(proyecto, 'con-nombre.cjs'),
    "const { Enrolamiento } = require('enrolamiento');\nconsole.log(typeof Enrolamiento === 'function' ? 'ok' : 'mal');",
  );
  writeFileSync(
    join(proyecto, 'por-omision.mjs'),
    "import Enrolamiento from 'enrolamiento';\nconsole.log(typeof Enrolamiento === 'function' ? 'ok' : 'mal');",
  );

  for (const archivo of ['esm.mjs', 'por-omision.mjs', 'cjs.cjs', 'con-nombre.cjs']) {
    const corrida = spawnSync(process.execPath, [archivo], { cwd: proyecto, encoding: 'utf8' });
    expect({ archivo, status: corrida.status, salida: corrida.stdout.trim() }).toEqual({ archivo, status: 0, salida: 'ok' });
  }
}, 120000);
