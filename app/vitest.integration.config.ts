import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only run integration tests — no setupFiles so console.error is visible
    include: ['src/__tests__/integration/**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
