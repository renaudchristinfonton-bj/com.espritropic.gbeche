/**
 * Comparaison par guerre : chaque mission doit compter dans SA guerre,
 * l'XP reste celle réellement créditée, et une guerre vide ne doit
 * jamais apparaître comme un échec.
 */
import type { AdversaryRow, WarRow } from '@/src/db/types';
import { buildReview, reviewWindow, warBreakdownOf, warExtremes } from '../review';

const NOW = new Date(2026, 10, 6, 12).getTime();
const WINDOW = reviewWindow(NOW, 7);

let seq = 0;
function adv(
  warId: string,
  status: AdversaryRow['status'],
  msAgo: number,
  xp = 20,
): AdversaryRow {
  seq += 1;
  return {
    id: `adv-${seq}`,
    template_id: null,
    battle_id: `battle-${warId}`,
    war_id: warId,
    title: 'mission',
    xp_reward: xp,
    scheduled_at: NOW - msAgo,
    hour: 7,
    minute: 0,
    duration_min: 10,
    status,
    completed_at: status === 'won' ? NOW - msAgo : null,
    created_at: NOW - msAgo,
    updated_at: NOW - msAgo,
  };
}

function war(id: string, title: string): WarRow {
  return {
    id,
    title,
    icon: 'flame',
    color: '#00E5FF',
    domain_type: 'custom',
    xp_earned: 0,
    is_active: 1,
    sort_order: 0,
    created_at: NOW,
    updated_at: NOW,
  };
}

const WARS = [war('w-sport', 'Santé'), war('w-money', 'Argent'), war('w-mind', 'Esprit')];

describe('warBreakdownOf', () => {
  it('range chaque mission dans sa guerre', () => {
    const lines = warBreakdownOf(
      [
        adv('w-sport', 'won', 86_400_000),
        adv('w-sport', 'won', 2 * 86_400_000),
        adv('w-money', 'lost', 86_400_000),
        adv('w-money', 'pending', 0),
      ],
      WARS,
      WINDOW,
    );
    const sport = lines.find((line) => line.id === 'w-sport');
    const money = lines.find((line) => line.id === 'w-money');
    expect(sport).toMatchObject({ title: 'Santé', wins: 2, losses: 0, pending: 0, total: 2 });
    expect(money).toMatchObject({ title: 'Argent', wins: 0, losses: 1, pending: 1, total: 2 });
  });

  it('calcule le taux de réussite et la part des victoires', () => {
    const lines = warBreakdownOf(
      [
        adv('w-sport', 'won', 86_400_000),
        adv('w-money', 'lost', 86_400_000),
      ],
      WARS,
      WINDOW,
    );
    expect(lines[0].id).toBe('w-sport');
    expect(lines[0].completionRate).toBe(1);
    expect(lines[0].share).toBe(1);
    expect(lines[1].completionRate).toBe(0);
  });

  it('renvoie null comme taux quand rien n’a été tranché', () => {
    const lines = warBreakdownOf([adv('w-mind', 'pending', 0)], WARS, WINDOW);
    expect(lines[0].completionRate).toBeNull();
    expect(lines[0].share).toBe(0);
  });

  it('additionne uniquement l’XP des victoires', () => {
    const lines = warBreakdownOf(
      [
        adv('w-sport', 'won', 86_400_000, 50),
        adv('w-sport', 'lost', 2 * 86_400_000, 50),
        adv('w-sport', 'pending', 0, 50),
      ],
      WARS,
      WINDOW,
    );
    expect(lines[0].xp).toBe(50);
  });

  it('ignore les missions hors période', () => {
    const lines = warBreakdownOf([adv('w-sport', 'won', 30 * 86_400_000)], WARS, WINDOW);
    expect(lines).toHaveLength(0);
  });

  it('nomme une guerre inconnue sans planter', () => {
    const lines = warBreakdownOf([adv('w-archived', 'won', 86_400_000)], WARS, WINDOW);
    expect(lines[0].title).toBe('Guerre archivée');
    expect(lines[0].icon).toBe('flag');
  });

  it('trie par réussite puis par volume', () => {
    const lines = warBreakdownOf(
      [
        adv('w-mind', 'lost', 86_400_000),
        adv('w-sport', 'won', 86_400_000),
        adv('w-money', 'won', 86_400_000),
        adv('w-money', 'won', 2 * 86_400_000),
      ],
      WARS,
      WINDOW,
    );
    expect(lines.map((line) => line.id)).toEqual(['w-money', 'w-sport', 'w-mind']);
  });

  it('expose le total planifié, en attente compris', () => {
    const lines = warBreakdownOf(
      [adv('w-sport', 'won', 86_400_000), adv('w-sport', 'pending', 0)],
      WARS,
      WINDOW,
    );
    expect(lines[0].total).toBe(2);
  });
});

describe('warExtremes', () => {
  it('désigne la meilleure et la plus fragile avec assez de matière', () => {
    const lines = warBreakdownOf(
      [
        adv('w-sport', 'won', 86_400_000),
        adv('w-sport', 'won', 2 * 86_400_000),
        adv('w-money', 'lost', 86_400_000),
        adv('w-money', 'lost', 2 * 86_400_000),
      ],
      WARS,
      WINDOW,
    );
    const { best, weakest } = warExtremes(lines);
    expect(best?.id).toBe('w-sport');
    expect(weakest?.id).toBe('w-money');
  });

  it('ne juge pas sur une seule mission', () => {
    const lines = warBreakdownOf([adv('w-sport', 'won', 86_400_000)], WARS, WINDOW);
    expect(warExtremes(lines)).toEqual({ best: null, weakest: null });
  });

  it('ne renvoie pas de « plus faible » quand une seule guerre est jugée', () => {
    const lines = warBreakdownOf(
      [adv('w-sport', 'won', 86_400_000), adv('w-sport', 'lost', 2 * 86_400_000)],
      WARS,
      WINDOW,
    );
    const { best, weakest } = warExtremes(lines);
    expect(best?.id).toBe('w-sport');
    expect(weakest).toBeNull();
  });
});

describe('intégration au bilan', () => {
  const review = buildReview({
    period: 7,
    now: NOW,
    transactions: [],
    adversaries: [
      adv('w-sport', 'won', 86_400_000),
      adv('w-sport', 'won', 2 * 86_400_000),
      adv('w-money', 'lost', 86_400_000),
      adv('w-money', 'lost', 2 * 86_400_000),
    ],
    wars: WARS,
  });

  it('attache la répartition au bilan', () => {
    expect(review.wars).toHaveLength(2);
    expect(review.wars[0].title).toBe('Santé');
  });

  it('produit un constat sur la guerre la plus solide', () => {
    expect(review.insights.some((insight) => insight.id === 'war-strongest')).toBe(true);
  });

  it('produit un constat sur la guerre qui décroche', () => {
    expect(review.insights.some((insight) => insight.id === 'war-weakest')).toBe(true);
  });

  it('reste vide sans liste de guerres fournie', () => {
    const withoutWars = buildReview({
      period: 7,
      now: NOW,
      transactions: [],
      adversaries: [adv('w-sport', 'won', 86_400_000)],
    });
    expect(withoutWars.wars).toHaveLength(1);
    expect(withoutWars.wars[0].title).toBe('Guerre archivée');
  });
});
