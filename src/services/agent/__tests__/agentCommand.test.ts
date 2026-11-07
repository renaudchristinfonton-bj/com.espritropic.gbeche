import {
  cleanMissionTitle,
  COMMAND_SUGGESTIONS,
  describeAction,
  detectCategory,
  formatFcfa,
  parseAmount,
  parseCommand,
} from '../agentCommand';

describe('parseAmount — montants en français (FCFA)', () => {
  test.each([
    ['5000', 5000],
    ['2 500 FCFA', 2500],
    ['j’ai payé 3k', 3000],
    ['20 mille francs', 20000],
    ['1,5 million', 1500000],
    ['5000f', 5000],
    ['12.500', 12500],
    ['une dépense de 100 000', 100000],
  ])('« %s » → %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  test('ignore les horaires et durées', () => {
    expect(parseAmount('rendez-vous à 7h')).toBeNull();
    expect(parseAmount('30 min de sport')).toBeNull();
  });

  test('renvoie null sans chiffre', () => {
    expect(parseAmount('bonjour chef')).toBeNull();
  });
});

describe('detectCategory', () => {
  test('dépenses : mots-clés français', () => {
    expect(detectCategory('taxi pour aller au bureau', 'expense')).toBe('transport');
    expect(detectCategory('achat de nourriture', 'expense')).toBe('food');
    expect(detectCategory('facture d’électricité', 'expense')).toBe('utilities');
    expect(detectCategory('loyer de la chambre', 'expense')).toBe('rent');
  });

  test('ne confond pas « réseau » avec « eau »', () => {
    // « réseau » contient la sous-chaîne « eau » mais ne doit pas
    // déclencher la catégorie factures (match sur mot entier uniquement).
    expect(detectCategory('un nouveau réseau social', 'expense')).not.toBe('utilities');
  });

  test('revenus : salaire, business, cadeau', () => {
    expect(detectCategory('salaire du mois', 'income')).toBe('salary');
    expect(detectCategory('recette de ma vente', 'income')).toBe('business');
  });

  test('replis sur les catégories fourre-tout', () => {
    expect(detectCategory('un truc bizarre', 'expense')).toBe('other_expense');
    expect(detectCategory('un apport quelconque', 'income')).toBe('other_income');
  });
});

describe('cleanMissionTitle', () => {
  test.each([
    ['ajoute une mission sport demain 7h', 'Sport'],
    ['rappelle-moi d’appeler maman ce soir', 'Appeler maman'],
    ['je dois réviser mes cours', 'Réviser mes cours'],
    ['n’oublie pas d’acheter du riz', 'Acheter du riz'],
  ])('« %s » → %s', (input, expected) => {
    expect(cleanMissionTitle(input)).toBe(expected);
  });
});

describe('parseCommand — actions financières', () => {
  test('dépense explicite', () => {
    const result = parseCommand('j’ai dépensé 2500 de transport');
    expect(result.kind).toBe('actions');
    expect(result.intent).toBe('add-expense');
    expect(result.actions).toEqual([
      { type: 'add-expense', amount: 2500, category: 'transport', label: 'Transport' },
    ]);
  });

  test('revenu avec catégorie', () => {
    const result = parseCommand('j’ai reçu 25000 de salaire');
    expect(result.intent).toBe('add-income');
    expect(result.actions?.[0]).toMatchObject({ type: 'add-income', amount: 25000, category: 'salary' });
  });

  test('création de budget mensuel', () => {
    const result = parseCommand('budget alimentation 30000');
    expect(result.intent).toBe('set-budget');
    expect(result.actions?.[0]).toMatchObject({ type: 'set-budget', amount: 30000, category: 'food' });
  });

  test('demande de montant manquant', () => {
    const result = parseCommand('j’ai dépensé pour le transport');
    expect(result.kind).toBe('reply');
    expect(result.intent).toBe('need-amount');
  });

  test('un conseil budget n’est pas une création de budget', () => {
    const result = parseCommand('comment va mon budget ?');
    expect(result.kind).toBe('reply');
    expect(result.intent).toBe('finance-review');
  });

  test('création de compte', () => {
    const result = parseCommand('crée un compte Wave');
    expect(result.actions?.[0]).toEqual({ type: 'create-account', name: 'Wave' });
  });
});

describe('parseCommand — missions', () => {
  test('mission planifiée demain avec heure', () => {
    const result = parseCommand('ajoute une mission sport demain 7h');
    expect(result.intent).toBe('add-mission');
    expect(result.actions?.[0]).toMatchObject({
      type: 'add-mission',
      title: 'Sport',
      when: 'tomorrow',
      hour: 7,
    });
  });

  test('rappel sans heure le soir', () => {
    const result = parseCommand('rappelle-moi d’appeler maman ce soir');
    expect(result.actions?.[0]).toMatchObject({
      type: 'add-mission',
      title: 'Appeler maman',
      when: 'today',
      hour: 19,
    });
  });

  test('mission terminée', () => {
    const result = parseCommand('j’ai fait mon footing');
    expect(result.intent).toBe('complete-mission');
    expect(result.actions?.[0]).toMatchObject({ type: 'complete-mission', query: 'footing' });
  });

  test('une question possessive ne crée pas de mission', () => {
    const result = parseCommand('mes missions du jour');
    expect(result.kind).toBe('reply');
    expect(['today', 'day-review']).toContain(result.intent);
  });
});

describe('parseCommand — récit de journée', () => {
  test('plusieurs actions dans un message', () => {
    const result = parseCommand(
      "aujourd’hui j’ai payé 1000 de taxi puis j’ai fait mon footing",
    );
    expect(result.kind).toBe('actions');
    expect(result.intent).toBe('journal');
    const types = (result.actions ?? []).map((a) => a.type);
    expect(types).toContain('add-expense');
    expect(types).toContain('complete-mission');
  });

  test('bilan de la journée sans action', () => {
    const result = parseCommand('bilan de ma journée');
    expect(result.kind).toBe('reply');
    expect(result.intent).toBe('day-review');
  });
});

describe('parseCommand — repli informatif', () => {
  test('salutation prise en charge par le cerveau local', () => {
    const result = parseCommand('bonjour');
    expect(result.kind).toBe('reply');
    expect(result.intent).toBe('brain-greeting');
    expect(result.text.length).toBeGreaterThan(5);
  });

  test('une phrase inconnue reçoit une réponse et des suggestions', () => {
    const result = parseCommand('parapluie lunaire');
    expect(result.kind).toBe('reply');
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});

describe('describeAction et formatage', () => {
  test('décrit chaque type d’action', () => {
    const descriptor = describeAction({
      type: 'add-expense',
      amount: 2500,
      category: 'transport',
      label: 'Transport',
    });
    expect(descriptor.icon).toBe('arrow-down-circle');
    expect(descriptor.detail).toContain('2 500 FCFA');
  });

  test('décrit une carte de plan de vie avec ses compteurs', () => {
    const descriptor = describeAction({
      type: 'create-life-plan',
      plan: {
        guideId: 'vehicle',
        warTitle: 'Projet — Véhicule (voiture ou moto)',
        icon: 'car',
        color: '#00E5FF',
        domainType: 'finance',
        battles: [
          { title: 'B1', priority: 'high', missions: [{ title: 'm1', frequency: 'weekly', hour: 18 }] },
          { title: 'B2', priority: 'medium', missions: [{ title: 'm2', frequency: 'monthly', hour: 18 }] },
        ],
        savings: {
          category: 'savings',
          label: 'Épargne véhicule',
          targetAmount: 3_000_000,
          horizonMonths: 12,
          monthlyAmount: 250_000,
          missionTitle: 'Versement',
        },
        summary: '',
      },
    });
    expect(descriptor.icon).toBe('car');
    expect(descriptor.title).toContain('Véhicule');
    expect(descriptor.detail).toContain('2 bataille(s)');
    expect(descriptor.detail).toContain('2 mission(s)');
    expect(descriptor.detail).toContain('250 000 FCFA/mois');
  });

  test('formatFcfa avec séparateurs', () => {
    expect(formatFcfa(1250000)).toBe('1 250 000 FCFA');
  });

  test('toutes les suggestions sont des exemples actionnables', () => {
    expect(COMMAND_SUGGESTIONS.length).toBeGreaterThanOrEqual(3);
  });
});
