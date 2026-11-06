/**
 * Cerveau local v3 — les réponses « quoi faire », « progresser », « score »
 * doivent s'appuyer uniquement sur le contexte fourni par l'écran.
 */
import { LocalBrainProvider } from '../localBrain.provider';
import type { BrainContext } from '../types';

const NOW = new Date(2026, 10, 6, 7, 5).getTime();

function ask(text: string, context: BrainContext = {}, brain = new LocalBrainProvider()) {
  return brain.respond({ raw: text, context });
}

describe('« je fais quoi maintenant »', () => {
  it('propose la prochaine mission avec son heure', () => {
    const answer = ask('je fais quoi maintenant', {
      nextMissionTitle: 'Séance sport',
      nextMissionAt: NOW,
    });
    expect(answer?.intent).toBe('brain-next-mission');
    expect(answer?.text).toContain('Séance sport');
    expect(answer?.text).toContain('7 h 05');
    expect(answer?.action).toEqual({ label: 'Voir mes missions', route: '/(app)/home' });
  });

  it('rappelle le nombre de missions restantes sans titre', () => {
    const answer = ask('par quoi commencer', { pendingToday: 3 });
    expect(answer?.intent).toBe('brain-next-mission');
    expect(answer?.text).toContain('3 mission');
    expect(answer?.action?.route).toBe('/(app)/home');
  });

  it('renvoie vers la planification quand la journée est vide', () => {
    const answer = ask('on attaque quoi', { pendingToday: 0 });
    expect(answer?.intent).toBe('brain-next-empty');
    expect(answer?.action?.route).toBe('/(app)/calendar');
  });
});

describe('progression', () => {
  it('cible la constance quand les missions tombent', () => {
    const answer = ask('comment progresser', { completionRate: 0.3, savingsRate: 0.3, score: 55 });
    expect(answer?.intent).toBe('brain-improve-discipline');
    expect(answer?.text).toContain('30 %');
    expect(answer?.action?.route).toBe('/(app)/wars');
  });

  it('cible la marge quand la discipline est déjà bonne', () => {
    const answer = ask('je veux ameliorer mon score', { completionRate: 0.9, savingsRate: 0.04 });
    expect(answer?.intent).toBe('brain-improve-savings');
    expect(answer?.action?.route).toBe('/(app)/agent');
  });

  it('cible les budgets dépassés ensuite', () => {
    const answer = ask('comment monter', { completionRate: 0.9, savingsRate: 0.3, overrunBudgets: 2 });
    expect(answer?.intent).toBe('brain-improve-budget');
    expect(answer?.text).toContain('2 budget');
    expect(answer?.action?.route).toBe('/(app)/finance');
  });

  it('reste encourageant quand tout va bien', () => {
    const answer = ask('progresser encore', { completionRate: 0.9, savingsRate: 0.3, score: 78 });
    expect(answer?.intent).toBe('brain-improve-steady');
    expect(answer?.text).toContain('78/100');
  });

  it('reste utile sans aucune donnée', () => {
    const answer = ask('ameliorer', {});
    expect(answer?.intent).toBe('brain-improve-empty');
    expect(answer?.action).toBeTruthy();
  });
});

describe('mon score', () => {
  it('donne le score réel du contexte', () => {
    const answer = ask('c est quoi mon score', { score: 72, periodDays: 30 });
    expect(answer?.intent).toBe('brain-score');
    expect(answer?.text).toContain('72/100');
    expect(answer?.text).toContain('30 jours');
    expect(answer?.action?.route).toBe('/(app)/review');
  });

  it('avoue ne pas avoir de bilan plutôt que d’inventer', () => {
    const answer = ask('ma note', {});
    expect(answer?.intent).toBe('brain-score-empty');
    expect(answer?.text).toContain('bilan de la semaine');
  });
});

describe('mémoire courte', () => {
  it('signale une question strictement répétée', () => {
    const brain = new LocalBrainProvider();
    const first = ask('comment progresser', { score: 60 }, brain);
    const second = ask('comment progresser', { score: 60 }, brain);
    expect(first?.intent).toBe('brain-improve-steady');
    expect(second?.intent).toBe('brain-repeat');
  });

  it('ne bloque pas une question reformulée', () => {
    const brain = new LocalBrainProvider();
    ask('comment progresser', { score: 60 }, brain);
    const reformulated = ask('comment je peux progresser', { score: 60 }, brain);
    expect(reformulated?.intent).not.toBe('brain-repeat');
  });

  it('oublie la répétition après un autre sujet', () => {
    const brain = new LocalBrainProvider();
    ask('ma note', { score: 60 }, brain);
    ask('qui es tu', {}, brain);
    const again = ask('ma note', { score: 60 }, brain);
    expect(again?.intent).toBe('brain-score');
  });
});

describe('non-régression des réponses existantes', () => {
  it('calcule toujours', () => {
    expect(ask('12 * 3')?.intent).toBe('brain-calc');
  });

  it('salue toujours', () => {
    expect(ask('cc')?.intent).toBe('brain-greeting');
  });

  it('explique toujours', () => {
    expect(ask('comment enregistrer une dépense')?.intent).toBe('brain-help-expense');
  });
});
