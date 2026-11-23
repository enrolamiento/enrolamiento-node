import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Corre también las pruebas de tipos (test/*.test-d.ts) con tsc, sobre el tsconfig de las pruebas.
    typecheck: { enabled: true, tsconfig: './tsconfig.test.json' },
  },
});
