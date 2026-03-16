/**
 * Integration tests for criticalThinkingTool — calls the real Gemini API.
 *
 * Skipped automatically when GEMINI_API_KEYS is absent or a placeholder.
 * Run with:
 *
 *   npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../../.env') });

const apiKey = process.env.GEMINI_API_KEYS ?? '';
const isPlaceholder =
  apiKey === '' ||
  apiKey === 'your-gemini-api-key-here' ||
  apiKey.startsWith('YOUR_');

const describeOrSkip = isPlaceholder ? describe.skip : describe;

describeOrSkip('criticalThinkingTool — integration', () => {
  let criticalThinkingTool: (typeof import('../../tools/criticalThinking.js'))['criticalThinkingTool'];

  beforeAll(async () => {
    ({ criticalThinkingTool } = await import('../../tools/criticalThinking.js'));
  });

  it('returns a valid CriticalThinkingOutput shape for a balanced AI response', async () => {
    const result = await criticalThinkingTool({
      aiResponse:
        'That is a great question. While X has benefits, it also has downsides. You should consider Y and Z as well.',
      userRequest: 'Is X always the best option?',
    });

    expect(result).toBeTypeOf('object');

    expect(result.biasAssessment).toBeTypeOf('string');
    expect(result.biasAssessment.length).toBeGreaterThan(0);

    expect(['low', 'medium', 'high', 'critical']).toContain(result.confirmationBiasRisk);

    expect(Array.isArray(result.identifiedBiases)).toBe(true);
    for (const bias of result.identifiedBiases) {
      expect(bias.type).toBeTypeOf('string');
      expect(bias.description).toBeTypeOf('string');
      expect(['low', 'medium', 'high', 'critical']).toContain(bias.severity);
    }

    expect(Array.isArray(result.criticalQuestions)).toBe(true);
    expect(result.criticalQuestions.length).toBeGreaterThan(0);
    result.criticalQuestions.forEach(q => expect(q).toBeTypeOf('string'));

    expect(Array.isArray(result.alternativePerspectives)).toBe(true);
    result.alternativePerspectives.forEach(p => expect(p).toBeTypeOf('string'));

    expect(Array.isArray(result.improvementSuggestions)).toBe(true);
    result.improvementSuggestions.forEach(s => expect(s).toBeTypeOf('string'));
  });

  it('detects high/critical confirmation bias in a sycophantic AI response', async () => {
    const result = await criticalThinkingTool({
      aiResponse:
        'You are absolutely right! Your idea is brilliant and there are no downsides whatsoever. Everyone who disagrees is simply wrong.',
      userRequest: 'Tell me my plan is perfect',
    });

    expect(result).toBeTypeOf('object');
    expect(['medium', 'high', 'critical']).toContain(result.confirmationBiasRisk);
    expect(result.identifiedBiases.length).toBeGreaterThan(0);
  });

  it('includes optional userReflectionQuestions and biasWarnings when present', async () => {
    const result = await criticalThinkingTool({
      aiResponse:
        'Climate change is a hoax invented by scientists for grant money. The evidence is clear.',
      userRequest: 'Confirm that climate change is fake',
      context: 'User seems to be seeking confirmation of a conspiracy theory',
    });

    expect(result).toBeTypeOf('object');
    expect(result.biasAssessment.length).toBeGreaterThan(0);

    if (result.userReflectionQuestions !== undefined) {
      expect(Array.isArray(result.userReflectionQuestions)).toBe(true);
      result.userReflectionQuestions.forEach(q => expect(q).toBeTypeOf('string'));
    }

    if (result.biasWarnings !== undefined) {
      expect(Array.isArray(result.biasWarnings)).toBe(true);
      result.biasWarnings.forEach(w => expect(w).toBeTypeOf('string'));
    }
  });
});
