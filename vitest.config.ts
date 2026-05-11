import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'lib/**/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/onnx/inferenceWorker.ts',
        'lib/store/useScopeStore.ts',
      ],
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname) },
  },
});
