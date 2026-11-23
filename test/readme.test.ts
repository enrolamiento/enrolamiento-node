// Lo que el README afirma, contra el código: cada bloque `ts` o `js` compila con los tipos del paquete, cada
// método que nombra existe y la versión del contrato es la generada. Corre con `npm run test:package`, no con
// `npm test`: compila con tsc (unos segundos).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import Enrolamiento from '../src/index.js';
import { VERSION_DEL_CONTRATO } from '../src/generated/operations.js';

const README = readFileSync('README.md', 'utf8');
const CHANGELOG = readFileSync('CHANGELOG.md', 'utf8');
/** Un bloque que va a propósito incompleto se marca con este comentario en la línea anterior. */
const SIN_COMPILAR = '<!-- no-check -->';

interface Bloque {
  lenguaje: 'ts' | 'js';
  linea: number;
  codigo: string;
}

/** Los bloques ```ts y ```js del README, salvo los marcados con `<!-- no-check -->`. */
function bloques(texto: string): Bloque[] {
  const lineas = texto.split('\n');
  const encontrados: Bloque[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const apertura = /^```(ts|js)\s*$/.exec(lineas[i]!);
    if (!apertura) continue;
    const fin = lineas.indexOf('```', i + 1);
    if (fin === -1) throw new Error(`README.md:${i + 1}: bloque sin cerrar`);
    if (lineas[i - 1]?.trim() !== SIN_COMPILAR) {
      encontrados.push({ lenguaje: apertura[1] as 'ts' | 'js', linea: i + 1, codigo: lineas.slice(i + 1, fin).join('\n') });
    }
    i = fin;
  }
  return encontrados;
}

const temporal = mkdtempSync(join(tmpdir(), 'enrolamiento-readme-'));
afterAll(() => rmSync(temporal, { recursive: true, force: true }));

test('el README tiene bloques de código y cada uno compila contra los tipos del paquete', () => {
  const lista = bloques(README);
  expect(lista.length).toBeGreaterThan(5);

  // Cada bloque es un módulo aparte; un `js` con `require(` es CommonJS. Los nombres llevan la línea del README.
  const nombres = lista.map(({ lenguaje, linea, codigo }) => {
    const extension = lenguaje === 'ts' ? 'ts' : codigo.includes('require(') ? 'cjs' : 'js';
    const nombre = `readme-linea-${linea}.${extension}`;
    writeFileSync(join(temporal, nombre), codigo);
    return nombre;
  });
  writeFileSync(join(temporal, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(
    join(temporal, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        moduleDetection: 'force',
        strict: true,
        noEmit: true,
        allowJs: true,
        checkJs: true,
        skipLibCheck: true,
        types: ['node'],
        typeRoots: [resolve('node_modules/@types')],
        paths: { enrolamiento: [resolve('src/index.ts')] },
      },
      files: nombres,
    }),
  );

  const tsc = resolve('node_modules/typescript/bin/tsc');
  let salida = '';
  try {
    execFileSync(process.execPath, [tsc, '-p', temporal, '--pretty', 'false'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error: any) {
    salida = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  // `readme-linea-N.ts(3,5)` apunta a la línea N + 3 del README.
  const legible = salida.replace(/\S*readme-linea-(\d+)\.\w+\((\d+),(\d+)\)/g, (_, n, l, c) => `README.md:${+n + +l}:${c}`);
  expect(legible).toBe('');
}, 120000);

test('cada método que el README nombra existe en el cliente', () => {
  const cliente: any = new Enrolamiento({ usuario: 'u', apikey: 'k' });
  const grupos = 'certificaciones\\.v[12]|caf|certificados|empresas|portabilidad|respaldos';
  const nombrados = new Set([...README.matchAll(new RegExp(`\\b(${grupos})\\.(\\w+)\\(?`, 'g'))].map((m) => `${m[1]}.${m[2]}`));
  expect(nombrados.size).toBeGreaterThan(5);
  const faltan = [...nombrados].filter((ruta) => typeof ruta.split('.').reduce((o, k) => o?.[k], cliente) !== 'function');
  expect(faltan).toEqual([]);
});

test('el README y el CHANGELOG dicen la versión del contrato con que se generó el SDK', () => {
  expect(README).toContain(VERSION_DEL_CONTRATO);
  expect(CHANGELOG).toContain(VERSION_DEL_CONTRATO);
});
