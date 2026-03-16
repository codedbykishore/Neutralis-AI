import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────
// Controllable mock for @google/generative-ai.
// We keep a module-level vi.fn() so individual tests can call
// mockResolvedValue / mockRejectedValue without re-registering
// a new vi.mock() (which Vitest hoists and only honours once).
// ─────────────────────────────────────────────────────────────

const mockGenerateContent = vi.fn().mockResolvedValue({
  response: { text: () => 'Mocked AI ethics response' },
});
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

vi.mock('@google/generative-ai', () => {
  // Must use a regular function so it can be called with `new`
  function GoogleGenerativeAI(this: any) {
    this.getGenerativeModel = mockGetGenerativeModel;
  }
  return { GoogleGenerativeAI };
});

describe('gemini utility', () => {
  beforeEach(() => {
    vi.resetModules();
    // Restore happy-path default before each test
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Mocked AI ethics response' },
    });
    mockGetGenerativeModel.mockReturnValue({ generateContent: mockGenerateContent });
  });

  // ─────────────────────────────────────────────────────────────
  // initializeGemini
  // ─────────────────────────────────────────────────────────────
  describe('initializeGemini', () => {
    it('should throw when called with an empty string', async () => {
      const { initializeGemini } = await import('../utils/gemini.js');
      expect(() => initializeGemini('')).toThrow();
    });

    it('should throw when all provided keys are placeholder values', async () => {
      const { initializeGemini } = await import('../utils/gemini.js');
      expect(() =>
        initializeGemini('your_actual_gemini_api_key_here')
      ).toThrow(/valid Gemini API key/i);
    });

    it('should throw for the "test_key" placeholder', async () => {
      const { initializeGemini } = await import('../utils/gemini.js');
      expect(() => initializeGemini('test_key')).toThrow(/valid Gemini API key/i);
    });

    it('should throw for REPLACE_WITH_YOUR_ACTUAL_GEMINI_API_KEY placeholder', async () => {
      const { initializeGemini } = await import('../utils/gemini.js');
      expect(() =>
        initializeGemini('REPLACE_WITH_YOUR_ACTUAL_GEMINI_API_KEY')
      ).toThrow(/valid Gemini API key/i);
    });

    it('should successfully initialize with a non-placeholder key', async () => {
      const { initializeGemini } = await import('../utils/gemini.js');
      expect(() => initializeGemini('real-looking-api-key-abc123')).not.toThrow();
    });

    it('should support comma-separated key rotation', async () => {
      const { initializeGemini, getKeyRotationStats } = await import('../utils/gemini.js');
      initializeGemini('key-one,key-two,key-three');
      const stats = getKeyRotationStats();
      expect(stats.totalKeys).toBe(3);
    });

    it('should trim whitespace around comma-separated keys', async () => {
      const { initializeGemini, getKeyRotationStats } = await import('../utils/gemini.js');
      initializeGemini('  key-one  ,  key-two  ');
      const stats = getKeyRotationStats();
      expect(stats.totalKeys).toBe(2);
    });

    it('should silently drop placeholder keys when mixed with valid ones', async () => {
      const { initializeGemini, getKeyRotationStats } = await import('../utils/gemini.js');
      initializeGemini('valid-key-abc,test_key');
      const stats = getKeyRotationStats();
      // Only 'valid-key-abc' should survive
      expect(stats.totalKeys).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getKeyRotationStats
  // ─────────────────────────────────────────────────────────────
  describe('getKeyRotationStats', () => {
    it('should return zero keys before initialization', async () => {
      const { getKeyRotationStats } = await import('../utils/gemini.js');
      const stats = getKeyRotationStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.keyStats).toEqual([]);
    });

    it('should return a preview of the key (first 10 chars + ...)', async () => {
      const { initializeGemini, getKeyRotationStats } = await import('../utils/gemini.js');
      initializeGemini('abcdefghijklmnop');
      const stats = getKeyRotationStats();
      expect(stats.keyStats[0].preview).toBe('abcdefghij...');
    });

    it('should track uses as 0 initially', async () => {
      const { initializeGemini, getKeyRotationStats } = await import('../utils/gemini.js');
      initializeGemini('some-key-12345');
      const stats = getKeyRotationStats();
      expect(stats.keyStats[0].uses).toBe(0);
      expect(stats.keyStats[0].failures).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getGeminiModel
  // ─────────────────────────────────────────────────────────────
  describe('getGeminiModel', () => {
    it('should throw when Gemini has not been initialized', async () => {
      const { getGeminiModel } = await import('../utils/gemini.js');
      expect(() => getGeminiModel()).toThrow(/not initialized/i);
    });

    it('should return a model object after initialization', async () => {
      const { initializeGemini, getGeminiModel } = await import('../utils/gemini.js');
      initializeGemini('fake-key-for-model-test');
      const model = getGeminiModel();
      expect(model).toBeDefined();
      expect(typeof model).toBe('object');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // cleanGeminiJsonResponse
  // ─────────────────────────────────────────────────────────────
  describe('cleanGeminiJsonResponse', () => {
    it('should strip ```json ... ``` markdown fencing', async () => {
      const { cleanGeminiJsonResponse } = await import('../utils/gemini.js');
      const input = '```json\n{"key":"value"}\n```';
      expect(cleanGeminiJsonResponse(input)).toBe('{"key":"value"}');
    });

    it('should strip plain ``` ... ``` fencing', async () => {
      const { cleanGeminiJsonResponse } = await import('../utils/gemini.js');
      const input = '```\n{"key":"value"}\n```';
      expect(cleanGeminiJsonResponse(input)).toBe('{"key":"value"}');
    });

    it('should return plain JSON unchanged', async () => {
      const { cleanGeminiJsonResponse } = await import('../utils/gemini.js');
      const input = '{"key":"value"}';
      expect(cleanGeminiJsonResponse(input)).toBe('{"key":"value"}');
    });

    it('should trim surrounding whitespace', async () => {
      const { cleanGeminiJsonResponse } = await import('../utils/gemini.js');
      const input = '   {"key":"value"}   ';
      expect(cleanGeminiJsonResponse(input)).toBe('{"key":"value"}');
    });

    it('should handle nested JSON with markdown fencing correctly', async () => {
      const { cleanGeminiJsonResponse } = await import('../utils/gemini.js');
      const inner = JSON.stringify({ concerns: [{ type: 'bias', severity: 'high' }] });
      const fenced = '```json\n' + inner + '\n```';
      const cleaned = cleanGeminiJsonResponse(fenced);
      expect(() => JSON.parse(cleaned)).not.toThrow();
      expect(JSON.parse(cleaned).concerns).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // generateEthicsResponse (uses top-level mock)
  // ─────────────────────────────────────────────────────────────
  describe('generateEthicsResponse', () => {
    it('should return text from the generative model on success', async () => {
      const { initializeGemini, generateEthicsResponse } = await import('../utils/gemini.js');
      initializeGemini('mocked-key');
      const result = await generateEthicsResponse('Test prompt');
      expect(result).toBe('Mocked AI ethics response');
    });

    it('should throw after all keys fail', async () => {
      // Make generateContent reject for this specific test
      mockGenerateContent.mockRejectedValue(new Error('429 Too Many Requests'));

      const { initializeGemini, generateEthicsResponse } = await import('../utils/gemini.js');
      initializeGemini('bad-key');
      await expect(generateEthicsResponse('Fail prompt')).rejects.toThrow(/API keys failed/i);
    });

    it('should increment totalUses on the key after a successful call', async () => {
      // Ensure we have a clean happy-path mock (restored in beforeEach)
      const { initializeGemini, generateEthicsResponse, getKeyRotationStats } = await import('../utils/gemini.js');
      initializeGemini('track-uses-key');
      await generateEthicsResponse('prompt');
      const stats = getKeyRotationStats();
      expect(stats.keyStats[0].uses).toBe(1);
    });
  });
});
