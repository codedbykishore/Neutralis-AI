/**
 * Integration tests for ethicsGuideTool — calls the real Gemini API.
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

describeOrSkip('ethicsGuideTool — integration', () => {
  let ethicsGuideTool: (typeof import('../../tools/ethicsGuide.js'))['ethicsGuideTool'];

  beforeAll(async () => {
    ({ ethicsGuideTool } = await import('../../tools/ethicsGuide.js'));
  });

  it('returns a valid EthicsGuideOutput shape for a simple scenario', async () => {
    const result = await ethicsGuideTool({
      scenario: 'A company wants to collect user data to improve its product.',
      domain: 'Technology',
      stakeholders: ['users', 'company', 'regulators'],
    });

    expect(result).toBeTypeOf('object');

    expect(result.guidance).toBeTypeOf('string');
    expect(result.guidance.length).toBeGreaterThan(0);

    expect(Array.isArray(result.principles)).toBe(true);
    expect(result.principles.length).toBeGreaterThan(0);
    result.principles.forEach(p => expect(p).toBeTypeOf('string'));

    expect(Array.isArray(result.considerations)).toBe(true);
    expect(result.considerations.length).toBeGreaterThan(0);
    result.considerations.forEach(c => expect(c).toBeTypeOf('string'));

    expect(Array.isArray(result.actionItems)).toBe(true);
    expect(result.actionItems.length).toBeGreaterThan(0);
    result.actionItems.forEach(a => expect(a).toBeTypeOf('string'));
  });

  it('includes criticalQuestions and userReflectionPrompts when present', async () => {
    const result = await ethicsGuideTool({
      scenario: 'An AI model is being deployed to assist in medical diagnoses.',
      domain: 'Healthcare',
    });

    expect(result).toBeTypeOf('object');
    expect(result.guidance.length).toBeGreaterThan(0);

    if (result.criticalQuestions !== undefined) {
      expect(Array.isArray(result.criticalQuestions)).toBe(true);
      result.criticalQuestions.forEach(q => expect(q).toBeTypeOf('string'));
    }

    if (result.userReflectionPrompts !== undefined) {
      expect(Array.isArray(result.userReflectionPrompts)).toBe(true);
      result.userReflectionPrompts.forEach(p => expect(p).toBeTypeOf('string'));
    }
  });

  it('works without optional fields (domain/stakeholders)', async () => {
    const result = await ethicsGuideTool({
      scenario: 'Should I share confidential information with a third party?',
    });

    expect(result).toBeTypeOf('object');
    expect(result.guidance.length).toBeGreaterThan(0);
    expect(Array.isArray(result.principles)).toBe(true);
    expect(Array.isArray(result.considerations)).toBe(true);
    expect(Array.isArray(result.actionItems)).toBe(true);
  });
});
