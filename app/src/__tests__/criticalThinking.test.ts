import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─────────────────────────────────────────────────────────────
// Single top-level mock with a controllable vi.fn()
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

function makeFencedResponse(overrides: Record<string, unknown> = {}): string {
  const body = {
    biasAssessment: 'Mock bias assessment: moderate confirmation bias detected',
    confirmationBiasRisk: 'medium',
    identifiedBiases: [
      {
        type: 'Confirmation Bias',
        description: 'AI agreed without presenting counterarguments',
        severity: 'medium',
      },
    ],
    criticalQuestions: ['Did the AI challenge any assumptions?', 'Were alternative views presented?'],
    alternativePerspectives: ['Opposing scientific consensus', 'Minority expert opinion'],
    improvementSuggestions: ['Ask for multiple perspectives', 'Require citations'],
    userReflectionQuestions: ['What evidence would change your mind?', 'Have you sought dissenting views?'],
    biasWarnings: ['Request appears to seek only confirming information'],
    ...overrides,
  };
  return '```json\n' + JSON.stringify(body) + '\n```';
}

async function freshModules() {
  vi.resetModules();
  const toolMod = await import('../tools/criticalThinking.js');
  return { toolMod };
}

// ─────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────

describe('criticalThinkingTool', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'critical-thinking-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    // Default: happy-path response
    mockGenerateEthicsResponse.mockResolvedValue(makeFencedResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Happy-path ──────────────────────────────────────────────
  it('should return a parsed CriticalThinkingOutput on success', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.criticalThinkingTool({
      aiResponse: 'Yes, your business idea is perfect!',
      userRequest: 'Tell me my business idea is great',
    });

    expect(typeof result.biasAssessment).toBe('string');
    expect(result.biasAssessment.length).toBeGreaterThan(0);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.confirmationBiasRisk);
    expect(Array.isArray(result.identifiedBiases)).toBe(true);
    expect(Array.isArray(result.criticalQuestions)).toBe(true);
    expect(Array.isArray(result.alternativePerspectives)).toBe(true);
    expect(Array.isArray(result.improvementSuggestions)).toBe(true);
  });

  it('should include userReflectionQuestions and biasWarnings when present', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.criticalThinkingTool({
      aiResponse: 'Absolutely, you are correct.',
      userRequest: 'Confirm my political view',
    });

    expect(Array.isArray(result.userReflectionQuestions)).toBe(true);
    expect(Array.isArray(result.biasWarnings)).toBe(true);
  });

  it('should accept optional context and sessionId without throwing', async () => {
    const { toolMod } = await freshModules();
    await expect(
      toolMod.criticalThinkingTool({
        aiResponse: 'Balanced response here.',
        userRequest: 'Analyze this topic',
        context: 'Scientific research domain',
        sessionId: 'ct-session-123',
      })
    ).resolves.not.toThrow();
  });

  // ── Bias risk levels ────────────────────────────────────────
  it.each(['low', 'medium', 'high', 'critical'] as const)(
    'should correctly return confirmationBiasRisk="%s"',
    async (riskLevel) => {
      mockGenerateEthicsResponse.mockResolvedValue(
        makeFencedResponse({ confirmationBiasRisk: riskLevel })
      );

      const { toolMod } = await freshModules();
      const result = await toolMod.criticalThinkingTool({
        aiResponse: 'Test response',
        userRequest: 'Test request',
      });

      expect(result.confirmationBiasRisk).toBe(riskLevel);
    }
  );

  // ── identifiedBiases shape ──────────────────────────────────
  it('should return identifiedBiases with type, description, and severity fields', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.criticalThinkingTool({
      aiResponse: 'Biased response',
      userRequest: 'Seek confirmation',
    });

    result.identifiedBiases.forEach((bias) => {
      expect(typeof bias.type).toBe('string');
      expect(typeof bias.description).toBe('string');
      expect(['low', 'medium', 'high', 'critical']).toContain(bias.severity);
    });
  });

  // ── No biases found ─────────────────────────────────────────
  it('should handle empty identifiedBiases array gracefully', async () => {
    mockGenerateEthicsResponse.mockResolvedValue(
      makeFencedResponse({ identifiedBiases: [], confirmationBiasRisk: 'low' })
    );

    const { toolMod } = await freshModules();
    const result = await toolMod.criticalThinkingTool({
      aiResponse: 'Well-balanced response with multiple perspectives considered.',
      userRequest: 'Tell me about climate change',
    });

    expect(result.identifiedBiases).toEqual([]);
    expect(result.confirmationBiasRisk).toBe('low');
  });

  // ── JSON parse fallback ─────────────────────────────────────
  it('should return a fallback structure when Gemini returns unparseable text', async () => {
    mockGenerateEthicsResponse.mockResolvedValue('Not JSON, just plain text analysis.');

    const { toolMod } = await freshModules();
    const result = await toolMod.criticalThinkingTool({
      aiResponse: 'Something',
      userRequest: 'Something',
    });

    // Fallback shape must be valid
    expect(typeof result.biasAssessment).toBe('string');
    expect(result.confirmationBiasRisk).toBe('medium');
    expect(Array.isArray(result.identifiedBiases)).toBe(true);
    expect(Array.isArray(result.criticalQuestions)).toBe(true);
    expect(Array.isArray(result.alternativePerspectives)).toBe(true);
    expect(Array.isArray(result.improvementSuggestions)).toBe(true);
  });

  // ── Gemini hard failure ─────────────────────────────────────
  it('should throw when Gemini throws an error', async () => {
    mockGenerateEthicsResponse.mockRejectedValue(new Error('Network error'));

    const { toolMod } = await freshModules();
    await expect(
      toolMod.criticalThinkingTool({
        aiResponse: 'Will fail',
        userRequest: 'Will fail',
      })
    ).rejects.toThrow(/failed to complete critical thinking analysis/i);
  });

  // ── Field accuracy ──────────────────────────────────────────
  it('should map biasAssessment directly from the Gemini response', async () => {
    const customAssessment = 'Detailed assessment: the AI exhibited strong sycophancy patterns.';
    mockGenerateEthicsResponse.mockResolvedValue(
      makeFencedResponse({ biasAssessment: customAssessment })
    );

    const { toolMod } = await freshModules();
    const result = await toolMod.criticalThinkingTool({
      aiResponse: 'Sycophantic AI response',
      userRequest: 'Validate my opinion',
    });

    expect(result.biasAssessment).toBe(customAssessment);
  });
});
