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
    guidance: 'Mock ethical guidance for the scenario',
    principles: ['Respect autonomy', 'Do no harm'],
    considerations: ['Impact on stakeholders', 'Long-term consequences'],
    actionItems: ['Consult ethics board', 'Document decisions'],
    criticalQuestions: ['What assumptions are you making?', 'Who could be harmed?'],
    userReflectionPrompts: ['What are your motivations?', 'Have you sought diverse perspectives?'],
    ...overrides,
  };
  return '```json\n' + JSON.stringify(body) + '\n```';
}

async function freshModules() {
  vi.resetModules();
  const toolMod = await import('../tools/ethicsGuide.js');
  return { toolMod };
}

// ─────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────

describe('ethicsGuideTool', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethics-guide-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    // Default: happy-path response
    mockGenerateEthicsResponse.mockResolvedValue(makeFencedResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Happy-path ──────────────────────────────────────────────
  it('should return a parsed EthicsGuideOutput on success', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsGuideTool({
      scenario: 'Should we use patient data without explicit consent?',
    });

    expect(typeof result.guidance).toBe('string');
    expect(result.guidance.length).toBeGreaterThan(0);
    expect(Array.isArray(result.principles)).toBe(true);
    expect(Array.isArray(result.considerations)).toBe(true);
    expect(Array.isArray(result.actionItems)).toBe(true);
  });

  it('should include criticalQuestions and userReflectionPrompts when provided', async () => {
    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsGuideTool({
      scenario: 'Evaluating AI in hiring',
      domain: 'Human Resources',
      stakeholders: ['candidates', 'HR team', 'legal'],
    });

    expect(Array.isArray(result.criticalQuestions)).toBe(true);
    expect(Array.isArray(result.userReflectionPrompts)).toBe(true);
  });

  it('should accept optional domain and stakeholders without throwing', async () => {
    const { toolMod } = await freshModules();
    await expect(
      toolMod.ethicsGuideTool({
        scenario: 'Deploying facial recognition in public spaces',
        domain: 'Public Safety',
        stakeholders: ['citizens', 'government', 'police'],
        sessionId: 'guide-session-1',
      })
    ).resolves.not.toThrow();
  });

  // ── Minimal output (fields empty) ──────────────────────────
  it('should handle Gemini returning minimal arrays gracefully', async () => {
    mockGenerateEthicsResponse.mockResolvedValue(
      makeFencedResponse({
        principles: [],
        considerations: [],
        actionItems: [],
        criticalQuestions: [],
        userReflectionPrompts: [],
      })
    );

    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsGuideTool({ scenario: 'Empty arrays scenario' });

    expect(result.principles).toEqual([]);
    expect(result.considerations).toEqual([]);
    expect(result.actionItems).toEqual([]);
  });

  // ── JSON parse fallback ─────────────────────────────────────
  it('should return a fallback structure when Gemini returns unparseable text', async () => {
    mockGenerateEthicsResponse.mockResolvedValue('Plain text, not JSON.');

    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsGuideTool({ scenario: 'Fallback test' });

    expect(typeof result.guidance).toBe('string');
    expect(Array.isArray(result.principles)).toBe(true);
    expect(Array.isArray(result.considerations)).toBe(true);
    expect(Array.isArray(result.actionItems)).toBe(true);
  });

  // ── Gemini hard failure ─────────────────────────────────────
  it('should throw when Gemini throws an error', async () => {
    mockGenerateEthicsResponse.mockRejectedValue(new Error('Service unavailable'));

    const { toolMod } = await freshModules();
    await expect(
      toolMod.ethicsGuideTool({ scenario: 'Will fail' })
    ).rejects.toThrow(/failed to generate ethics guidance/i);
  });

  // ── Output shape accuracy ───────────────────────────────────
  it('should map guidance field directly from the Gemini response', async () => {
    const customGuidance = 'Always ensure informed consent is obtained from all participants.';
    mockGenerateEthicsResponse.mockResolvedValue(
      makeFencedResponse({ guidance: customGuidance })
    );

    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsGuideTool({ scenario: 'Consent scenario' });

    expect(result.guidance).toBe(customGuidance);
  });

  it('should return principles as individual string items', async () => {
    mockGenerateEthicsResponse.mockResolvedValue(
      makeFencedResponse({ principles: ['Autonomy', 'Beneficence', 'Non-maleficence', 'Justice'] })
    );

    const { toolMod } = await freshModules();
    const result = await toolMod.ethicsGuideTool({ scenario: 'Medical ethics' });

    expect(result.principles).toHaveLength(4);
    result.principles.forEach(p => expect(typeof p).toBe('string'));
  });
});
