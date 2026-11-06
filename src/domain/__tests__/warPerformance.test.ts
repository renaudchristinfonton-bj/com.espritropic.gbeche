/**
 * Performance d'une guerre et choix de la guerre à relancer.
 *
 * Deux garanties tenues par ces tests :
 *  - on ne compare que des périodes de même durée, et un manque de données
 *    donne null plutôt qu'un chiffre inventé ;
 *  - on ne relance jamais une guerre qui n'a pas de quoi être jugée, ni une
 *    guerre où l'utilisateur a déjà prévu quelque chose aujourd'hui.
 */
import type { AdversaryRow, WarRow } from '@/src/db/types';
import {
  buildReview,
  focusWarOf,
  reviewWindow,
  warBreakdownOf,
  warPerformance,
  type ReviewWarLine,
} from '../review';

const NOW = new Date(2026, 10, 6, 12).getTime();
const DAY = 86_400_000;

let seq = 0;
function adv(warId: string, status: AdversaryRow['status'], msAgo: number): AdversaryRow {
  seq += 1;
  return {
    id: `a-${seq}`,
    template_id: null,
    battle_id: `b-${warId}`,
    war_id: warId,
    title: 'mission',
    xp_reward: 10,
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

const WAR: WarRow = {
  id: 'w-sport',
  title: 'Santé',
  icon: 'flame',
  color: '#00E5FF',
  domain_type: 'health',
  xp_earned: 0,
  is_active: 1,
  sort_order: 0,
  created_at: NOW,
  updated_at: NOW,
};

function line(partial: Partial<ReviewWarLine> & { id: string }): ReviewWarLine {
  return {
    title: partial.id,
    icon: 'flag',
    color: '#00E5FF',
    wins: 0,
    losses: 0,
    pending: 0,
    total: 0,
    completionRate: null,
    xp: 0,
    share: 0,
    ...partial,
  };
}

describe('warPerformance', () => {
  it('compare la période courante à la précédente', () => {
    const performance = warPerformance(
      [
        // 30 jours courants : 1 victoire, 1 défaite → 50 %
        adv('w-sport', 'won', 2 * DAY),
        adv('w-sport', 'lost', 3 * DAY),
        // 30 jours précédents : 2 défaites → 0 %
        adv('w-sport', 'lost', 35 * DAY),
        adv('w-sport', 'lost', 40 * DAY),
      ],
      WAR,
      NOW,
      30,
    );
    expect(performance.current?.completionRate).toBe(0.5);
    expect(performance.previous?.completionRate).toBe(0);
    expect(performance.rateDelta).toBeCloseTo(0.5);
    expect(performance.winsDelta).toBe(1);
  });

  it('renvoie null quand la période précédente n’a aucune mission tranchée', () => {
    const performance = warPerformance([adv('w-sport', 'won', 2 * DAY)], WAR, NOW, 30);
    expect(performance.current).not.toBeNull();
    expect(performance.previous).toBeNull();
    expect(performance.rateDelta).toBeNull();
    expect(performance.winsDelta).toBeNull();
  });

  it('renvoie une ligne courante nulle si rien n’est planifié', () => {
    const performance = warPerformance([], WAR, NOW, 30);
    expect(performance.current).toBeNull();
    expect(performance.previous).toBeNull();
    expect(performance.rateDelta).toBeNull();
  });

  it('ne mélange jamais deux guerres', () => {
    const performance = warPerformance(
      [adv('w-sport', 'won', 2 * DAY), adv('w-money', 'lost', 2 * DAY), adv('w-money', 'lost', 3 * DAY)],
      WAR,
      NOW,
      30,
    );
    expect(performance.current?.wins).toBe(1);
    expect(performance.current?.losses).toBe(0);
  });

  it('respecte la durée demandée', () => {
    const week = warPerformance([adv('w-sport', 'won', 5 * DAY)], WAR, NOW, 7);
    const month = warPerformance([adv('w-sport', 'won', 5 * DAY)], WAR, NOW, 30);
    expect(week.current?.wins).toBe(1);
    expect(month.current?.wins).toBe(1);
    // Une mission d'il y a 5 jours n'est plus dans la semaine précédente.
    expect(week.previous).toBeNull();
  });
});

describe('focusWarOf', () => {
  it('désigne la guerre fragile quand rien n’est prévu', () => {
    const lines = [
      line({ id: 'w-sport', wins: 5, losses: 0, total: 5, completionRate: 1 }),
      line({ id: 'w-money', wins: 0, losses: 4, total: 4, completionRate: 0 }),
    ];
    expect(focusWarOf(lines, [])?.id).toBe('w-money');
  });

  it('ne relance pas une guerre où une mission est déjà prévue', () => {
    const lines = [
      line({ id: 'w-sport', wins: 5, losses: 0, total: 5, completionRate: 1 }),
      line({ id: 'w-money', wins: 0, losses: 4, total: 4, completionRate: 0 }),
    ];
    expect(focusWarOf(lines, ['w-money'])).toBeNull();
  });

  it('ne relance pas une guerre au-dessus du seuil', () => {
    const lines = [
      line({ id: 'w-sport', wins: 5, losses: 0, total: 5, completionRate: 1 }),
      line({ id: 'w-money', wins: 3, losses: 2, total: 5, completionRate: 0.6 }),
    ];
    expect(focusWarOf(lines, [])).toBeNull();
  });

  it('ne juge pas sur une seule mission', () => {
    const lines = [
      line({ id: 'w-sport', wins: 4, losses: 0, total: 4, completionRate: 1 }),
      line({ id: 'w-money', wins: 0, losses: 1, total: 1, completionRate: 0 }),
    ];
    expect(focusWarOf(lines, [])).toBeNull();
  });

  it('accepte un seuil personnalisé', () => {
    const lines = [
      line({ id: 'w-sport', wins: 5, losses: 0, total: 5, completionRate: 1 }),
      line({ id: 'w-money', wins: 3, losses: 2, total: 5, completionRate: 0.6 }),
    ];
    expect(focusWarOf(lines, [], 0.8)?.id).toBe('w-money');
  });

  it('ignore les missions en attente dans le taux', () => {
    const lines = [
      line({ id: 'w-sport', wins: 4, losses: 0, total: 4, completionRate: 1 }),
      line({ id: 'w-money', wins: 0, losses: 3, pending: 5, total: 8, completionRate: 0 }),
    ];
    expect(focusWarOf(lines, [])?.id).toBe('w-money');
  });

  it('fonctionne de bout en bout depuis de vraies lignes', () => {
    const adversaries = [
      adv('w-sport', 'won', 2 * DAY),
      adv('w-sport', 'won', 3 * DAY),
      adv('w-money', 'lost', 2 * DAY),
      adv('w-money', 'lost', 4 * DAY),
      adv('w-money', 'lost', 5 * DAY),
    ];
    const lines = warBreakdownOf(adversaries, [WAR, { ...WAR, id: 'w-money', title: 'Argent' }], reviewWindow(NOW, 30));
    expect(focusWarOf(lines, [])?.id).toBe('w-money');
  });
});

describe('intégration au bilan', () => {
  it('le bilan expose de quoi alimenter le rappel intelligent', () => {
    const review = buildReview({
      period: 30,
      now: NOW,
      transactions: [],
      adversaries: [
        adv('w-sport', 'won', 2 * DAY),
        adv('w-sport', 'won', 3 * DAY),
        adv('w-money', 'lost', 2 * DAY),
        adv('w-money', 'lost', 3 * DAY),
      ],
      wars: [WAR, { ...WAR, id: 'w-money', title: 'Argent' }],
    });
    expect(focusWarOf(review.wars, [])?.id).toBe('w-money');
  });
});
