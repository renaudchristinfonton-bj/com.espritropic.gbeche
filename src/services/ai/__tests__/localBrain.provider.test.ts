/**
 * Tests du cerveau local : discussion, calculs, enveloppes d'épargne,
 * explications de fonctionnalités et conseils contextualisés.
 * Le fournisseur ne fait jamais de réseau et renvoie null quand il ne
 * reconnaît pas le sujet (le moteur de règles prend alors le relais).
 */
import { LocalBrainProvider } from '../localBrain.provider';

const brain = new LocalBrainProvider();

describe('discussion générale', () => {
  test('répond aux salutations dont le « cc »', () => {
    for (const hello of ['cc', 'salut', 'bonjour', 'wesh']) {
      const reply = brain.respond({ raw: hello });
      expect(reply?.intent).toBe('brain-greeting');
      expect(reply!.text.length).toBeGreaterThan(10);
    }
  });

  test('formules de politesse et identité', () => {
    expect(brain.respond({ raw: 'merci beaucoup' })?.intent).toBe('brain-thanks');
    const identity = brain.respond({ raw: 'qui es-tu ?' });
    expect(identity?.intent).toBe('brain-identity');
    expect(identity?.text).toMatch(/GBECHE|quartier général/i);
  });

  test('motivation quand ça devient dur', () => {
    const reply = brain.respond({ raw: 'je suis découragé' });
    expect(reply?.intent).toBe('brain-motivation');
  });
});

describe('calculs locaux', () => {
  test('arithmétique parlée', () => {
    expect(brain.respond({ raw: 'combien font 250000 * 12 ?' })?.text).toContain('3 000 000');
    expect(brain.respond({ raw: 'calcule (8 + 2) / 5' })?.text).toContain('2');
  });

  test('pourcentage de', () => {
    const reply = brain.respond({ raw: '20% de 50000' });
    expect(reply?.intent).toBe('brain-percent');
    expect(reply?.text).toContain('10 000 FCFA');
  });
});

describe('enveloppes d épargne', () => {
  test('mensuelle avec montant et horizon', () => {
    const reply = brain.respond({ raw: 'je veux épargner 3 000 000 FCFA en 1 an, combien par mois ?' });
    expect(reply?.intent).toBe('brain-savings');
    expect(reply?.text).toContain('250 000 FCFA');
    expect(reply?.text).toContain('chaque mois');
  });

  test('versement hebdomadaire', () => {
    const reply = brain.respond({ raw: 'objectif 1 000 000 dans 12 mois, combien verser chaque semaine ?' });
    expect(reply?.intent).toBe('brain-savings');
    expect(reply?.text).toContain('chaque semaine');
  });

  test('tous les trois jours', () => {
    const reply = brain.respond({ raw: 'je veux 900 000 en 6 mois avec un versement tous les 3 jours' });
    expect(reply?.text).toContain('tous les 3 jours');
  });

  test('renvoie null sans montant ou sans horizon', () => {
    expect(brain.respond({ raw: 'je veux épargner beaucoup' })).toBeNull();
  });
});

describe('explications et conseils', () => {
  test('explique comment enregistrer une dépense', () => {
    const reply = brain.respond({ raw: 'comment enregistrer une dépense ?' });
    expect(reply?.intent).toBe('brain-help-expense');
    expect(reply?.text).toMatch(/confirmation/);
  });

  test('explique ce qu est une guerre', () => {
    const reply = brain.respond({ raw: "c'est quoi une guerre ?" });
    expect(reply?.intent).toBe('brain-help-war');
  });

  test('conseil contextualisé avec dépassement budgétaire', () => {
    const reply = brain.respond({
      raw: 'un conseil ?',
      context: { overrunBudgets: 2, pendingToday: 3 },
    });
    expect(reply?.intent).toBe('brain-advice');
    expect(reply?.text).toContain('2');
    expect(reply?.text).toContain('3');
  });

  test('conseil rassurant sans alerte', () => {
    const reply = brain.respond({ raw: 'que me recommandes-tu ?', context: {} });
    expect(reply?.text).toMatch(/aucune alerte/i);
  });

  test('retombe sur null pour un sujet inconnu sans mot-clé', () => {
    expect(brain.respond({ raw: 'xyzzy' })).toBeNull();
  });
});
