/**
 * Tests du moteur de projets de vie : détection d'aspiration, dialogue
 * multi-tours avec validation des réponses, et construction du plan.
 * Logique pure, sans base : le moindre faux positif de détection est
 * interdit (d'où les tests de limites sur mots entiers).
 */
import { getLifeGuide } from '../../../domain/lifeGuides';
import {
  applyAnswer,
  buildPlan,
  currentQuestion,
  detectAspiration,
  isCancelRequest,
  isDraftComplete,
  monthlyEnvelope,
  parseMonths,
  shouldOpenAspiration,
  startDraft,
} from '../lifeProject.service';

describe('détection d aspiration (mots entiers, jamais de sous-chaîne)', () => {
  test('reconnaît les trois exemples du cahier des charges', () => {
    expect(detectAspiration('Je veux me marier l année prochaine')?.id).toBe('marriage');
    expect(detectAspiration("J'aimerais avoir une voiture")?.id).toBe('vehicle');
    expect(detectAspiration('Je veux grandir dans ma foi')?.id).toBe('faith');
  });

  test('ne confond pas un mot qui contient seulement la racine', () => {
    // « foire » contient « foi » mais ne doit pas déclencher le guide spirituel.
    expect(detectAspiration('La foire du village commence')).toBeNull();
    // « maisonnée » / texte sans rapport.
    expect(detectAspiration('Rien à signaler pour aujourd hui')).toBeNull();
  });

  test('les phrases financières sans aspiration restent nulles', () => {
    expect(detectAspiration('')).toBeNull();
    expect(detectAspiration('ok')).toBeNull();
  });

  test('détecte chaque guide du catalogue via au moins un mot-clé', () => {
    const samples: Record<string, string> = {
      marriage: 'on prepare le mariage',
      vehicle: 'je vise une nouvelle moto',
      faith: 'ma priere quotidienne',
      housing: 'je veux acheter un terrain',
      education: 'je passe un examen important',
      career: 'je vise une promotion',
      health: 'je veux maigrir',
      family: 'je veux fonder une famille',
      business: 'je lance mon commerce',
      travel: 'je reve de voyage',
      discipline: 'je dois vaincre ma procrastination',
    };
    for (const [guideId, phrase] of Object.entries(samples)) {
      expect(detectAspiration(phrase)?.id).toBe(guideId);
    }
  });
});

describe('shouldOpenAspiration — garde-fou anti-détournement', () => {
  test('ouvre un guide sur une ambition pure', () => {
    const guide = shouldOpenAspiration({ kind: 'reply', intent: 'unknown' }, 'je veux une voiture');
    expect(guide?.id).toBe('vehicle');
  });

  test("ne détourne pas une dépense incomplète qui attend un montant", () => {
    // « j'ai payé la réparation de la voiture » → le parseur demande le montant.
    expect(shouldOpenAspiration({ kind: 'reply', intent: 'need-amount' }, "j'ai payé la voiture")).toBeNull();
  });

  test('ne passe jamais devant une carte d action', () => {
    expect(
      shouldOpenAspiration({ kind: 'actions', intent: 'add-expense' }, 'voiture 5000'),
    ).toBeNull();
  });

  test('une phrase sans mot-clé de guide reste fermée', () => {
    expect(shouldOpenAspiration({ kind: 'reply', intent: 'unknown' }, 'bonjour à toi')).toBeNull();
  });
});

describe('parseMonths — délais exprimés en français', () => {
  test('convertit années et mois', () => {
    expect(parseMonths('1 an')).toBe(12);
    expect(parseMonths('2 ans ou plus')).toBe(24);
    expect(parseMonths('6 mois')).toBe(6);
    expect(parseMonths('3 mois')).toBe(3);
  });

  test('un nombre nu vaut des mois ; un texte invalide renvoie null', () => {
    expect(parseMonths('10')).toBe(10);
    expect(parseMonths('aucun')).toBeNull();
  });
});

describe('dialogue multi-tours', () => {
  test('annulation reconnue sur mot entier', () => {
    expect(isCancelRequest('Annuler le projet')).toBe(true);
    expect(isCancelRequest('stop')).toBe(true);
    expect(isCancelRequest('je continue')).toBe(false);
  });

  test('un montant invalide ne fait pas avancer le brouillon', () => {
    const guide = getLifeGuide('vehicle')!;
    let draft = startDraft(guide.id);
    // Question 1 : vision (texte libre).
    draft = applyAnswer(draft, 'Une citadine d occasion fiable', guide).draft;
    expect(draft.stepIndex).toBe(1);
    // Question 2 : montant. Réponse invalide → même étape, erreur.
    const invalid = applyAnswer(draft, 'beaucoup d argent', guide);
    expect(invalid.error).toBeTruthy();
    expect(invalid.draft.stepIndex).toBe(1);
    // Bon montant → on avance.
    const valid = applyAnswer(draft, '3 000 000 FCFA', guide);
    expect(valid.error).toBeUndefined();
    expect(valid.draft.stepIndex).toBe(2);
    expect(valid.draft.slots.target).toBe('3 000 000 FCFA');
  });

  test('un délai illisible repose la question sans avancer', () => {
    const guide = getLifeGuide('faith')!;
    let draft = startDraft(guide.id);
    draft = applyAnswer(draft, 'Une prière régulière et une vie de service', guide).draft;
    const invalid = applyAnswer(draft, 'plus tard peut etre', guide);
    expect(invalid.error).toBeTruthy();
    expect(invalid.draft.stepIndex).toBe(1);
  });

  test('parcourt toutes les questions puis marque le brouillon prêt', () => {
    const guide = getLifeGuide('faith')!;
    let draft = startDraft(guide.id);
    const answers = ['Grandir dans la prière et le service', '1 an', '20 min/jour'];
    for (const answer of answers) {
      expect(currentQuestion(draft, guide)).not.toBeNull();
      const outcome = applyAnswer(draft, answer, guide);
      draft = outcome.draft;
    }
    expect(isDraftComplete(draft, guide)).toBe(true);
    expect(draft.status).toBe('ready');
  });
});

describe('construction du plan', () => {
  test('plan véhicule : guerres, missions et enveloppe d épargne chiffrée', () => {
    const guide = getLifeGuide('vehicle')!;
    const draft = {
      guideId: guide.id,
      stepIndex: guide.questions.length,
      status: 'ready' as const,
      slots: {
        vision: 'Une citadine d occasion',
        target: '3 000 000 FCFA',
        horizon: '1 an',
        stage: 'Permis en poche',
      },
    };
    const plan = buildPlan(guide, draft);

    expect(plan.warTitle).toContain('Véhicule');
    expect(plan.battles.length).toBe(guide.battles.length);
    expect(plan.savings).not.toBeNull();
    expect(plan.savings?.targetAmount).toBe(3_000_000);
    expect(plan.savings?.horizonMonths).toBe(12);
    // 3 000 000 / 12 = 250 000, arrondi à la centaine supérieure.
    expect(plan.savings?.monthlyAmount).toBe(250_000);

    // La mission de versement mensuel est ajoutée à la première bataille.
    const allTitles = plan.battles.flatMap((b) => b.missions.map((m) => m.title));
    expect(allTitles).toContain(guide.savings!.missionTitle);
    expect(plan.battles[0].missions.some((m) => m.frequency === 'monthly')).toBe(true);

    // Le résumé cite les chiffres réels, jamais de donnée inventée.
    expect(plan.summary).toContain('3 000 000 FCFA');
    expect(plan.summary).toContain('250 000 FCFA');
    expect(plan.summary).toMatch(/confirme/);
  });

  test('plan spirituel sans argent : aucune épargne, que des missions', () => {
    const guide = getLifeGuide('faith')!;
    const draft = {
      guideId: guide.id,
      stepIndex: guide.questions.length,
      status: 'ready' as const,
      slots: {
        vision: 'Une vie de prière régulière',
        horizon: '6 mois',
        rhythm: '10 min/jour',
      },
    };
    const plan = buildPlan(guide, draft);
    expect(plan.savings).toBeNull();
    expect(plan.battles.flatMap((b) => b.missions).length).toBeGreaterThan(0);
    expect(plan.summary).not.toContain('FCFA');
  });

  test('enveloppe mensuelle arrondie à la centaine supérieure', () => {
    expect(monthlyEnvelope(1_000_000, 12)).toBe(83_400); // 83 333,33 → 83 400
    expect(monthlyEnvelope(0, 12)).toBe(0);
  });
});
