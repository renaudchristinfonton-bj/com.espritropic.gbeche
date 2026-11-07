/**
 * Le bilan doit arriver dans la conversation sans jamais inventer de chiffre,
 * et toujours proposer l'écran qui va avec.
 */
import { parseCommand } from '@/src/services/agent/agentCommand';
import { reviewToChat, reviewOneLiner } from '@/src/services/review.service';
import { buildReview, periodFromText } from '@/src/domain/review';
import type { TransactionRow } from '@/src/db/types';

const NOW = new Date(2026, 10, 6, 12).getTime();

function tx(amount: number, timestamp: number, type: 'income' | 'expense'): TransactionRow {
  return {
    id: `t-${timestamp}-${amount}`,
    account_id: 'a',
    amount,
    type,
    category: type === 'income' ? 'salary' : 'food',
    label: 'x',
    note: '',
    is_recurring: 0,
    timestamp,
    created_at: timestamp,
  };
}

const review = buildReview({
  period: 7,
  now: NOW,
  transactions: [tx(50_000, NOW - 2 * 86_400_000, 'income'), tx(-20_000, NOW - 86_400_000, 'expense')],
  adversaries: [],
  profile: { streak: 2 },
});

describe('periodFromText', () => {
  it('reconnaît les durées explicites', () => {
    expect(periodFromText('bilan de la semaine')).toBe(7);
    expect(periodFromText('mon bilan hebdo')).toBe(7);
    expect(periodFromText('bilan du mois')).toBe(30);
    expect(periodFromText('bilan mensuel')).toBe(30);
    expect(periodFromText('bilan du trimestre')).toBe(90);
    expect(periodFromText('les 30 derniers jours')).toBe(30);
    expect(periodFromText('90 jours')).toBe(90);
  });

  it('ne choisit pas de durée quand la phrase n’en donne pas', () => {
    expect(periodFromText('bilan')).toBeNull();
    expect(periodFromText('bilan de ma journée')).toBeNull();
    expect(periodFromText('fais le point')).toBeNull();
  });

  it('ignore les accents et la casse', () => {
    expect(periodFromText('BILAN DE LA SEMAINE')).toBe(7);
    expect(periodFromText('bilan du MOIS')).toBe(30);
  });
});

describe('parseCommand — routage du bilan', () => {
  it('route « bilan de la semaine » vers le bilan de période', () => {
    const parsed = parseCommand('bilan de la semaine');
    expect(parsed.intent).toBe('period-review');
    expect(parsed.period).toBe(7);
  });

  it('route « bilan du mois » sur 30 jours', () => {
    expect(parseCommand('bilan du mois').period).toBe(30);
  });

  it('route « bilan du trimestre » sur 90 jours', () => {
    expect(parseCommand('bilan du trimestre').period).toBe(90);
  });

  it('laisse « bilan de ma journée » au bilan du jour', () => {
    expect(parseCommand('bilan de ma journée').intent).toBe('day-review');
  });

  it('laisse un simple « bilan » au bilan du jour', () => {
    expect(parseCommand('bilan').intent).toBe('day-review');
  });

  it('ne confond pas un projet d’épargne avec un bilan', () => {
    const parsed = parseCommand('je veux épargner 3 000 000 en 12 mois');
    expect(parsed.intent).not.toBe('period-review');
  });
});

describe('reviewToChat', () => {
  it('résume le score, l’argent et les missions', () => {
    const answer = reviewToChat(review);
    expect(answer.text).toContain(`${review.score.value}/100`);
    expect(answer.text).toContain('Argent');
    expect(answer.text).toContain('Missions');
  });

  it('propose d’ouvrir l’écran Bilan', () => {
    expect(reviewToChat(review).action).toEqual({
      label: 'Ouvrir le bilan',
      route: '/(app)/review',
    });
  });

  it('ne contient jamais de valeur technique', () => {
    const text = reviewToChat(review).text;
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('null');
  });

  it('dit franchement quand aucune mission n’est tranchée', () => {
    expect(reviewToChat(review).text).toContain('aucune');
  });

  it('tient en six lignes maximum', () => {
    expect(reviewToChat(review).text.split('\n').length).toBeLessThanOrEqual(6);
  });
});

describe('reviewOneLiner', () => {
  it('condense en une ligne', () => {
    const line = reviewOneLiner(review);
    expect(line).toContain('Score');
    expect(line).toContain('FCFA');
    expect(line.split('\n')).toHaveLength(1);
  });
});
