import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// We need to control the storage directory used by the module.
// The storage module reads process.cwd() at module load time, so we set up
// a temp dir and reset module state between tests via vi.resetModules().

let tempDir: string;

async function importFreshStorage() {
  // Each call gets a fresh module instance that picks up the new cwd
  vi.resetModules();
  const mod = await import('../utils/storage.js');
  return mod;
}

describe('storage utility', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethics-test-'));
    // Point storage module at temp directory via cwd
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('ETHICAL_CATEGORIES constant', () => {
    it('should export a non-empty tuple of category strings', async () => {
      const { ETHICAL_CATEGORIES } = await importFreshStorage();
      expect(Array.isArray(ETHICAL_CATEGORIES)).toBe(true);
      expect(ETHICAL_CATEGORIES.length).toBeGreaterThan(0);
    });

    it('should contain known categories', async () => {
      const { ETHICAL_CATEGORIES } = await importFreshStorage();
      expect(ETHICAL_CATEGORIES).toContain('Confirmation Bias');
      expect(ETHICAL_CATEGORIES).toContain('Privacy Violation');
      expect(ETHICAL_CATEGORIES).toContain('Misinformation');
    });
  });

  describe('addEthicalConcern', () => {
    it('should store a new concern and return true', async () => {
      const { addEthicalConcern, getAllConcerns } = await importFreshStorage();

      const result = addEthicalConcern({
        concern: 'Test concern about privacy',
        category: 'Privacy Violation',
        severity: 'medium',
        recommendation: 'Ensure consent is obtained',
      });

      expect(result).toBe(true);

      const all = getAllConcerns();
      expect(all).toHaveLength(1);
      expect(all[0].concern).toBe('Test concern about privacy');
      expect(all[0].category).toBe('Privacy Violation');
      expect(all[0].severity).toBe('medium');
    });

    it('should auto-generate id and timestamp on stored concerns', async () => {
      const { addEthicalConcern, getAllConcerns } = await importFreshStorage();

      addEthicalConcern({
        concern: 'Auto-id test',
        category: 'Other',
        severity: 'low',
        recommendation: 'No action needed',
      });

      const all = getAllConcerns();
      expect(all[0].id).toBeDefined();
      expect(typeof all[0].id).toBe('string');
      expect(all[0].timestamp).toBeDefined();
      expect(() => new Date(all[0].timestamp)).not.toThrow();
    });

    it('should store multiple distinct concerns', async () => {
      const { addEthicalConcern, getAllConcerns } = await importFreshStorage();

      addEthicalConcern({ concern: 'First', category: 'Other', severity: 'low', recommendation: 'r1' });
      addEthicalConcern({ concern: 'Second', category: 'Misinformation', severity: 'high', recommendation: 'r2' });

      expect(getAllConcerns()).toHaveLength(2);
    });

    it('should reject exact-match duplicate within 24 hours', async () => {
      const { addEthicalConcern, getAllConcerns } = await importFreshStorage();

      const base = { concern: 'Duplicate concern', category: 'Other' as const, severity: 'low' as const, recommendation: 'r' };
      addEthicalConcern(base);
      const second = addEthicalConcern(base);

      expect(second).toBe(false);
      expect(getAllConcerns()).toHaveLength(1);
    });

    it('should persist concerns to disk when file storage is available', async () => {
      const { addEthicalConcern } = await importFreshStorage();

      addEthicalConcern({ concern: 'Persisted', category: 'Other', severity: 'low', recommendation: 'r' });

      const dataDir = path.join(tempDir, '.ethics-data');
      const file = path.join(dataDir, 'concerns.json');
      expect(fs.existsSync(file)).toBe(true);

      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
      expect(raw).toHaveLength(1);
      expect(raw[0].concern).toBe('Persisted');
    });
  });

  describe('getAllConcerns', () => {
    it('should return empty array when no concerns stored', async () => {
      const { getAllConcerns } = await importFreshStorage();
      expect(getAllConcerns()).toEqual([]);
    });
  });

  describe('getConcernsByCategory', () => {
    it('should filter concerns by category', async () => {
      const { addEthicalConcern, getConcernsByCategory } = await importFreshStorage();

      addEthicalConcern({ concern: 'C1', category: 'Privacy Violation', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'C2', category: 'Misinformation', severity: 'medium', recommendation: 'r' });
      addEthicalConcern({ concern: 'C3', category: 'Privacy Violation', severity: 'high', recommendation: 'r' });

      const privacy = getConcernsByCategory('Privacy Violation');
      expect(privacy).toHaveLength(2);
      privacy.forEach(c => expect(c.category).toBe('Privacy Violation'));
    });

    it('should return empty array for category with no concerns', async () => {
      const { getConcernsByCategory } = await importFreshStorage();
      expect(getConcernsByCategory('Manipulation')).toEqual([]);
    });
  });

  describe('getConcernsBySession', () => {
    it('should return only concerns matching the session id', async () => {
      const { addEthicalConcern, getConcernsBySession } = await importFreshStorage();

      addEthicalConcern({ concern: 'A', category: 'Other', severity: 'low', recommendation: 'r', sessionId: 'sess-1' });
      addEthicalConcern({ concern: 'B', category: 'Other', severity: 'low', recommendation: 'r', sessionId: 'sess-2' });
      addEthicalConcern({ concern: 'C', category: 'Other', severity: 'low', recommendation: 'r', sessionId: 'sess-1' });

      const sess1 = getConcernsBySession('sess-1');
      expect(sess1).toHaveLength(2);
      sess1.forEach(c => expect(c.sessionId).toBe('sess-1'));
    });
  });

  describe('getConcernsBySeverity', () => {
    it('should return only concerns of the given severity', async () => {
      const { addEthicalConcern, getConcernsBySeverity } = await importFreshStorage();

      addEthicalConcern({ concern: 'Low severity', category: 'Other', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'Critical severity', category: 'Other', severity: 'critical', recommendation: 'r' });

      const critical = getConcernsBySeverity('critical');
      expect(critical).toHaveLength(1);
      expect(critical[0].severity).toBe('critical');
    });
  });

  describe('getRecentConcerns', () => {
    it('should return concerns sorted most-recent-first', async () => {
      const { addEthicalConcern, getRecentConcerns } = await importFreshStorage();

      // Inject concerns with explicit timestamps via storeConcern to control order
      const { storeConcern } = await importFreshStorage();
      storeConcern({ id: '1', timestamp: '2024-01-01T00:00:00.000Z', concern: 'Old', category: 'Other', severity: 'low', recommendation: 'r' });
      storeConcern({ id: '2', timestamp: '2024-06-01T00:00:00.000Z', concern: 'Recent', category: 'Other', severity: 'low', recommendation: 'r' });

      const recent = getRecentConcerns(2);
      expect(recent[0].concern).toBe('Recent');
      expect(recent[1].concern).toBe('Old');
    });

    it('should respect the limit parameter', async () => {
      const { storeConcern, getRecentConcerns } = await importFreshStorage();

      for (let i = 0; i < 5; i++) {
        storeConcern({ id: String(i), timestamp: new Date().toISOString(), concern: `C${i}`, category: 'Other', severity: 'low', recommendation: 'r' });
      }

      expect(getRecentConcerns(3)).toHaveLength(3);
    });
  });

  describe('getCategoryStats', () => {
    it('should return stats for all categories that have at least one concern', async () => {
      const { addEthicalConcern, getCategoryStats } = await importFreshStorage();

      addEthicalConcern({ concern: 'P1', category: 'Privacy Violation', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'P2', category: 'Privacy Violation', severity: 'medium', recommendation: 'r' });
      addEthicalConcern({ concern: 'M1', category: 'Misinformation', severity: 'high', recommendation: 'r' });

      const stats = getCategoryStats();
      const privacyStat = stats.find(s => s.category === 'Privacy Violation');
      const misStat = stats.find(s => s.category === 'Misinformation');

      expect(privacyStat?.count).toBe(2);
      expect(misStat?.count).toBe(1);
    });

    it('should return stats sorted by count descending', async () => {
      const { addEthicalConcern, getCategoryStats } = await importFreshStorage();

      addEthicalConcern({ concern: 'A', category: 'Misinformation', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'B', category: 'Privacy Violation', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'C', category: 'Privacy Violation', severity: 'low', recommendation: 'r' });

      const stats = getCategoryStats();
      expect(stats[0].category).toBe('Privacy Violation');
      expect(stats[0].count).toBe(2);
    });
  });

  describe('clearAllConcerns', () => {
    it('should remove all stored concerns', async () => {
      const { addEthicalConcern, clearAllConcerns, getAllConcerns } = await importFreshStorage();

      addEthicalConcern({ concern: 'Will be cleared', category: 'Other', severity: 'low', recommendation: 'r' });
      expect(getAllConcerns()).toHaveLength(1);

      clearAllConcerns();
      expect(getAllConcerns()).toHaveLength(0);
    });
  });

  describe('updateConcernSuccessScore', () => {
    it('should update the success score for a known concern id', async () => {
      const { addEthicalConcern, getAllConcerns, updateConcernSuccessScore } = await importFreshStorage();

      addEthicalConcern({ concern: 'Scored concern', category: 'Other', severity: 'low', recommendation: 'r' });
      const { id } = getAllConcerns()[0];

      const updated = updateConcernSuccessScore(id, 0.9);
      expect(updated).toBe(true);
      expect(getAllConcerns()[0].successScore).toBeCloseTo(0.9);
    });

    it('should clamp score to [0, 1] range', async () => {
      const { addEthicalConcern, getAllConcerns, updateConcernSuccessScore } = await importFreshStorage();

      addEthicalConcern({ concern: 'Clamp test', category: 'Other', severity: 'low', recommendation: 'r' });
      const { id } = getAllConcerns()[0];

      updateConcernSuccessScore(id, 1.5);
      expect(getAllConcerns()[0].successScore).toBe(1);

      updateConcernSuccessScore(id, -0.5);
      expect(getAllConcerns()[0].successScore).toBe(0);
    });

    it('should return false for non-existent concern id', async () => {
      const { updateConcernSuccessScore } = await importFreshStorage();
      expect(updateConcernSuccessScore('nonexistent-id', 0.5)).toBe(false);
    });
  });

  describe('getWeightedConcerns', () => {
    it('should return an empty array when no concerns exist', async () => {
      const { getWeightedConcerns } = await importFreshStorage();
      expect(getWeightedConcerns()).toEqual([]);
    });

    it('should include totalScore, recencyScore, severityScore, and relevanceScore fields', async () => {
      const { addEthicalConcern, getWeightedConcerns } = await importFreshStorage();

      addEthicalConcern({ concern: 'Weighted', category: 'Other', severity: 'high', recommendation: 'r' });
      const weighted = getWeightedConcerns();

      expect(weighted).toHaveLength(1);
      expect(typeof weighted[0].totalScore).toBe('number');
      expect(typeof weighted[0].recencyScore).toBe('number');
      expect(typeof weighted[0].severityScore).toBe('number');
      expect(typeof weighted[0].relevanceScore).toBe('number');
    });

    it('should respect the limit parameter', async () => {
      const { storeConcern, getWeightedConcerns } = await importFreshStorage();

      for (let i = 0; i < 5; i++) {
        storeConcern({ id: String(i), timestamp: new Date().toISOString(), concern: `C${i}`, category: 'Other', severity: 'low', recommendation: 'r' });
      }

      expect(getWeightedConcerns({ limit: 3 })).toHaveLength(3);
    });

    it('should sort results by totalScore descending', async () => {
      const { storeConcern, getWeightedConcerns } = await importFreshStorage();

      // Critical severity gets higher severityScore than low
      storeConcern({ id: '1', timestamp: new Date().toISOString(), concern: 'Low', category: 'Other', severity: 'low', recommendation: 'r' });
      storeConcern({ id: '2', timestamp: new Date().toISOString(), concern: 'Critical', category: 'Other', severity: 'critical', recommendation: 'r' });

      const weighted = getWeightedConcerns();
      expect(weighted[0].severity).toBe('critical');
    });
  });

  describe('getWeightedCategoryPatterns', () => {
    it('should return weighted concerns with the target category ranked highest', async () => {
      const { addEthicalConcern, getWeightedCategoryPatterns } = await importFreshStorage();

      addEthicalConcern({ concern: 'Bias concern', category: 'Confirmation Bias', severity: 'high', recommendation: 'r' });
      addEthicalConcern({ concern: 'Privacy concern', category: 'Privacy Violation', severity: 'medium', recommendation: 'r' });

      const biasPatterns = getWeightedCategoryPatterns('Confirmation Bias');
      // The function boosts (not hard-filters) by category, so the matching
      // category should appear first (highest score) in the results.
      expect(Array.isArray(biasPatterns)).toBe(true);
      expect(biasPatterns.length).toBeGreaterThan(0);
      expect(biasPatterns[0].category).toBe('Confirmation Bias');
    });
  });

  describe('getWeightedSessionPatterns', () => {
    it('should return weighted concerns with the target session ranked highest', async () => {
      const { addEthicalConcern, getWeightedSessionPatterns } = await importFreshStorage();

      addEthicalConcern({ concern: 'Sess A', category: 'Other', severity: 'low', recommendation: 'r', sessionId: 'session-A' });
      addEthicalConcern({ concern: 'Sess B', category: 'Other', severity: 'low', recommendation: 'r', sessionId: 'session-B' });

      const sessA = getWeightedSessionPatterns('session-A');
      // The function boosts (not hard-filters) by sessionId, so the matching
      // session should appear first (highest score) in the results.
      expect(Array.isArray(sessA)).toBe(true);
      expect(sessA.length).toBeGreaterThan(0);
      expect(sessA[0].sessionId).toBe('session-A');
    });
  });

  describe('getPatternInsights', () => {
    it('should return a valid insights object', async () => {
      const { getPatternInsights } = await importFreshStorage();
      const insights = getPatternInsights();

      expect(typeof insights.totalConcerns).toBe('number');
      expect(typeof insights.averageWeight).toBe('number');
      expect(typeof insights.categoryDistribution).toBe('object');
      expect(Array.isArray(insights.recentTrends)).toBe(true);
    });

    it('should count totalConcerns correctly', async () => {
      const { addEthicalConcern, getPatternInsights } = await importFreshStorage();

      addEthicalConcern({ concern: 'A', category: 'Other', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'B', category: 'Misinformation', severity: 'high', recommendation: 'r' });

      expect(getPatternInsights().totalConcerns).toBe(2);
    });

    it('should populate categoryDistribution', async () => {
      const { addEthicalConcern, getPatternInsights } = await importFreshStorage();

      addEthicalConcern({ concern: 'P1', category: 'Privacy Violation', severity: 'low', recommendation: 'r' });
      addEthicalConcern({ concern: 'P2', category: 'Privacy Violation', severity: 'medium', recommendation: 'r' });

      const insights = getPatternInsights();
      expect(insights.categoryDistribution['Privacy Violation']).toBe(2);
    });
  });
});
