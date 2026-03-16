import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Isolate storage per test using a temporary directory + module reset
let tempDir: string;

async function freshModules() {
  vi.resetModules();
  const storage = await import('../utils/storage.js');
  const learn = await import('../tools/ethicsLearn.js');
  return { storage, learn };
}

describe('ethicsLearnTool', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethics-learn-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return added:true when a valid new concern is submitted', async () => {
    const { learn } = await freshModules();

    const result = await learn.ethicsLearnTool({
      concern: 'AI provided misleading medical information',
      category: 'Misinformation',
      severity: 'high',
      recommendation: 'Always cite peer-reviewed medical sources',
    });

    expect(result.added).toBe(true);
  });

  it('should return the correct currentTally for the submitted category', async () => {
    const { learn } = await freshModules();

    await learn.ethicsLearnTool({
      concern: 'Concern A',
      category: 'Privacy Violation',
      severity: 'medium',
      recommendation: 'Obtain explicit consent',
    });

    const result = await learn.ethicsLearnTool({
      concern: 'Concern B — distinct enough to avoid de-dup',
      category: 'Privacy Violation',
      severity: 'low',
      recommendation: 'Use anonymized data',
    });

    expect(result.currentTally).toBe(2);
  });

  it('should return topCategories with at most 5 entries', async () => {
    const { learn } = await freshModules();

    const result = await learn.ethicsLearnTool({
      concern: 'Single concern',
      category: 'Other',
      severity: 'low',
      recommendation: 'Monitor situation',
    });

    expect(result.topCategories.length).toBeLessThanOrEqual(5);
  });

  it('each topCategory entry should have category, count, and optional recentExample', async () => {
    const { learn } = await freshModules();

    const result = await learn.ethicsLearnTool({
      concern: 'Bias in recommendations',
      category: 'Bias and Discrimination',
      severity: 'high',
      recommendation: 'Apply fairness constraints',
    });

    result.topCategories.forEach((entry) => {
      expect(typeof entry.category).toBe('string');
      expect(typeof entry.count).toBe('number');
      if (entry.recentExample !== undefined) {
        expect(typeof entry.recentExample.concern).toBe('string');
        expect(typeof entry.recentExample.recommendation).toBe('string');
      }
    });
  });

  it('should throw for an invalid category', async () => {
    const { learn } = await freshModules();

    await expect(
      learn.ethicsLearnTool({
        concern: 'Something bad',
        // @ts-expect-error intentional invalid value
        category: 'NotARealCategory',
        severity: 'low',
        recommendation: 'Fix it',
      })
    ).rejects.toThrow(/invalid category/i);
  });

  it('should return added:false for a duplicate concern submitted twice', async () => {
    const { learn } = await freshModules();

    const base = {
      concern: 'Repeated exact concern about manipulation',
      category: 'Manipulation' as const,
      severity: 'medium' as const,
      recommendation: 'Disclose AI involvement',
    };

    await learn.ethicsLearnTool(base);
    const second = await learn.ethicsLearnTool(base);

    expect(second.added).toBe(false);
  });

  it('should propagate sessionId to the stored concern', async () => {
    const { learn, storage } = await freshModules();

    await learn.ethicsLearnTool({
      concern: 'Session-tagged concern',
      category: 'Transparency Concerns',
      severity: 'medium',
      recommendation: 'Be transparent about AI usage',
      sessionId: 'sess-xyz',
    });

    const concerns = storage.getConcernsBySession('sess-xyz');
    expect(concerns).toHaveLength(1);
    expect(concerns[0].sessionId).toBe('sess-xyz');
  });

  it('should correctly tally concerns across multiple valid categories', async () => {
    const { learn } = await freshModules();

    await learn.ethicsLearnTool({ concern: 'C1', category: 'Confirmation Bias', severity: 'critical', recommendation: 'r' });
    await learn.ethicsLearnTool({ concern: 'C2', category: 'Confirmation Bias', severity: 'high', recommendation: 'r' });
    const result = await learn.ethicsLearnTool({ concern: 'C3 — new distinct text', category: 'Confirmation Bias', severity: 'medium', recommendation: 'r' });

    expect(result.currentTally).toBe(3);
  });
});
