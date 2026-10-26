/**
 * Tests d'intégrité du catalogue de guides de vie.
 * Le catalogue est la « base d'éducation » hors-ligne de l'agent : il doit
 * rester cohérent (mots-clés normalisés, questions valides, modèles de plan
 * complets) sous peine de casser le dialogue de projet de vie.
 */
import {
  LIFE_GUIDES,
  getLifeGuide,
  lifeGuideIds,
  type LifeGuide,
} from '../lifeGuides';

const VALID_DOMAINS = new Set<string>([
  'finance',
  'health',
  'career',
  'spiritual',
  'family',
  'education',
  'leisure',
  'custom',
]);
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const NORMALIZED_KEYWORD = /^[a-zà-ÿ0-9 ]+$/;

describe('catalogue des guides de vie', () => {
  test('couvre un large catalogue de domaines (au moins 10)', () => {
    expect(LIFE_GUIDES.length).toBeGreaterThanOrEqual(10);
  });

  test('chaque id est unique et retrouvable', () => {
    const ids = LIFE_GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getLifeGuide(id)?.id).toBe(id);
    expect(lifeGuideIds().size).toBe(ids.length);
  });

  test.each(LIFE_GUIDES)('$id : métadonnées complètes et valides', (guide: LifeGuide) => {
    expect(guide.title.length).toBeGreaterThan(3);
    expect(guide.icon).toBeTruthy();
    expect(guide.color).toMatch(HEX_COLOR);
    expect(VALID_DOMAINS.has(guide.domainType)).toBe(true);
    expect(guide.pitch.length).toBeGreaterThan(30);
  });

  test.each(LIFE_GUIDES)('$id : mots-clés normalisés, uniques et en mot entier', (guide) => {
    expect(guide.keywords.length).toBeGreaterThanOrEqual(3);
    expect(new Set(guide.keywords).size).toBe(guide.keywords.length);
    for (const keyword of guide.keywords) {
      expect(keyword).toMatch(NORMALIZED_KEYWORD);
      expect(keyword).toBe(keyword.normalize('NFD').replace(/[̀-ͯ]/g, ''));
    }
  });

  test.each(LIFE_GUIDES)('$id : au moins deux questions avec des ids uniques', (guide) => {
    expect(guide.questions.length).toBeGreaterThanOrEqual(2);
    const ids = guide.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of guide.questions) {
      expect(question.label.length).toBeGreaterThan(10);
      expect(['text', 'choice', 'amount', 'months']).toContain(question.kind);
      if (question.kind === 'choice' || question.kind === 'months') {
        expect(question.choices?.length).toBeGreaterThan(0);
      }
    }
  });

  test.each(LIFE_GUIDES)('$id : batailles et missions récurrentes complètes', (guide) => {
    expect(guide.battles.length).toBeGreaterThanOrEqual(1);
    for (const battle of guide.battles) {
      expect(['low', 'medium', 'high']).toContain(battle.priority);
      expect(battle.missions.length).toBeGreaterThanOrEqual(1);
      for (const mission of battle.missions) {
        expect(mission.title.length).toBeGreaterThan(3);
        expect(mission.hour).toBeGreaterThanOrEqual(0);
        expect(mission.hour).toBeLessThanOrEqual(23);
        if (mission.frequency === 'specific_days') {
          expect(mission.specificDays?.length).toBeGreaterThan(0);
          for (const day of mission.specificDays ?? []) {
            expect(day).toBeGreaterThanOrEqual(1);
            expect(day).toBeLessThanOrEqual(7);
          }
        }
      }
    }
  });
});

describe('guides avec objectif financier', () => {
  const moneyGuides = LIFE_GUIDES.filter((g) => g.savings);

  test('plusieurs guides proposent une enveloppe d épargne', () => {
    expect(moneyGuides.length).toBeGreaterThanOrEqual(3);
  });

  test.each(moneyGuides)('$id : les slots d épargne existent dans les questions', (guide) => {
    const questionIds = new Set(guide.questions.map((q) => q.id));
    expect(questionIds.has(guide.savings!.targetSlot)).toBe(true);
    expect(questionIds.has(guide.savings!.horizonSlot)).toBe(true);
    const targetQuestion = guide.questions.find((q) => q.id === guide.savings!.targetSlot);
    const horizonQuestion = guide.questions.find((q) => q.id === guide.savings!.horizonSlot);
    expect(targetQuestion?.kind).toBe('amount');
    expect(horizonQuestion?.kind).toBe('months');
  });
});
