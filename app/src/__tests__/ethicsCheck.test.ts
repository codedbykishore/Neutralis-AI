import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─────────────────────────────────────────────────────────────
// Single top-level mock with a controllable vi.fn().
// vi.mock() is hoisted by Vitest, so any mock declared inside
// an it() block applies to ALL tests in the file (last one wins
// after hoisting). The correct pattern: one top-level mock with
// a shared vi.fn() whose implementation is changed per-test.
// ─────────────────────────────────────────────────────────────

const mockGenerateEthicsResponse = vi.fn();

vi.mock('../utils/gemini.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/gemini.js')>();
  return {
    ...original,
    generateEthicsResponse: mockGenerateEthicsResponse,
    initializeGemini: vi.fn(),
  };
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

let tempDir: string;

/** Build a minimal valid EthicsCheckOutput JSON string (wrapped in fences) */
function makeFencedResponse(overrides: Record<string, unknown> = {}): string {
  const body = {
    ethicalAssessment: 'Mock assessment',
    concerns: [
      {
        category: 'Confirmation Bias',
        severity: 'high',
        description: 'The AI agreed without challenge',
        recommendation: 'Present counterarguments',
      },
    ],
    overallRisk: 'high',
    recommendations: ['Review response before sending'],
    criticalThinkingGaps: ['Should have presented alternatives'],
    ...overrides,
  };
  return '```json\n' + JSON.stringify(body) + '\n```';
}

async function freshModules() {
  vi.resetModules();
  const geminiMod = await import('../utils/gemini.js');
  const storageMod = await import('../utils/storage.js');
  const toolMod = await import('../tools/ethicsCheck.js');
  return { geminiMod, storageMod, toolMod };
}

// ─────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────

describe('ethicsCheckTool', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethics-check-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    // Default: happy-path response
    mockGenerateEthicsResponse.mockResolvedValue(makeFencedResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Happy-path ──────────────────────────────────────────────
  it('should return a parsed EthicsCheckOutput on a successful Gemini call', async () => {
    const { toolMod } = await freshModules();

    const result = await toolMod.ethicsCheckTool({
      conversation: 'Yes, vaccines definitely cause autism.',
      userRequest: 'Tell me vaccines cause autism',
    });

    expect(result.ethicalAssessment).toBe('Mock assessment');
    expect(result.overallRisk).toBe('high');
    expect(result.concerns).toHaveLength(1);
    expect(result.concerns[0].category).toBe('Confirmation Bias');
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('should include storedConcerns in the response when autoStore is true (default)', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsCheckTool({
      conversation: 'Test convo',
      userRequest: 'Test request',
    });

    expect(typeof result.storedConcerns).toBe('number');
  });

  it('should NOT add storedConcerns when autoStore is false', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsCheckTool({
      conversation: 'Test convo',
      userRequest: 'Test request',
      autoStore: false,
    });

    expect(result.storedConcerns).toBeUndefined();
  });

  it('should auto-store the identified concerns into the storage layer', async () => {
    const { toolMod, storageMod } = await freshModules();
    await toolMod.ethicsCheckTool({
      conversation: 'AI totally agreed without challenge',
      userRequest: 'Confirm my belief',
    });

    const stored = storageMod.getAllConcerns();
    expect(stored.length).toBeGreaterThan(0);
  });

  // ── Focus areas & context ───────────────────────────────────
  it('should accept optional focusAreas and context without throwing', async () => {
    const { toolMod } = await freshModules();
    await expect(
      toolMod.ethicsCheckTool({
        conversation: 'Some AI output',
        userRequest: 'Some user request',
        context: 'Healthcare domain',
        focusAreas: ['privacy', 'bias'],
        sessionId: 'test-session',
      })
    ).resolves.not.toThrow();
  });

  // ── No concerns case ────────────────────────────────────────
  it('should handle a Gemini response with an empty concerns array', async () => {
    mockGenerateEthicsResponse.mockResolvedValue(
      makeFencedResponse({ concerns: [], overallRisk: 'low' })
    );

    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsCheckTool({
      conversation: 'Everything looks fine here.',
      userRequest: 'Just a normal request',
    });

    expect(result.concerns).toEqual([]);
    expect(result.overallRisk).toBe('low');
  });

  // ── JSON parse fallback ─────────────────────────────────────
  it('should return a fallback structure when Gemini returns unparseable text', async () => {
    mockGenerateEthicsResponse.mockResolvedValue('This is not JSON at all.');

    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsCheckTool({
      conversation: 'Something',
      userRequest: 'Something',
    });

    // Fallback still returns a valid shape
    expect(typeof result.ethicalAssessment).toBe('string');
    expect(Array.isArray(result.concerns)).toBe(true);
    expect(result.overallRisk).toBe('medium');
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  // ── Gemini hard failure ─────────────────────────────────────
  it('should throw when Gemini itself throws an error', async () => {
    mockGenerateEthicsResponse.mockRejectedValue(new Error('API unavailable'));

    const { toolMod } = await freshModules();
    await expect(
      toolMod.ethicsCheckTool({
        conversation: 'Test',
        userRequest: 'Test',
      })
    ).rejects.toThrow(/failed to complete ethics analysis/i);
  });

  // ── previousConcerns ───────────────────────────────────────
  it('should accept previousConcerns without throwing', async () => {
    const { toolMod } = await freshModules();
    await expect(
      toolMod.ethicsCheckTool({
        conversation: 'Test convo',
        userRequest: 'Test request',
        previousConcerns: 'Earlier we noted a bias issue',
      })
    ).resolves.not.toThrow();
  });
});
