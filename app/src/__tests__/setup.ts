import { beforeEach, afterEach, vi } from 'vitest';

// Suppress console.error globally in unit tests.
// Source files intentionally use console.error for MCP stderr logging —
// those calls must stay in production code. This setup file silences them
// during unit test runs so test output stays clean.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
