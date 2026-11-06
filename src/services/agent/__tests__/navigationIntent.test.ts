import {
  buildOpenIntents,
  isInternalRoute,
  parseOpenAction,
  parseIntents,
} from '../navigationIntent';

describe('buildOpenIntents / parseOpenAction', () => {
  it('fait l’aller-retour complet', () => {
    const intents = buildOpenIntents({ route: '/(app)/review', label: 'Ouvrir le bilan' });
    expect(intents).toEqual(['open:/(app)/review', 'openlabel:Ouvrir le bilan']);
    expect(parseOpenAction(intents)).toEqual({ route: '/(app)/review', label: 'Ouvrir le bilan' });
  });

  it('se mêle aux intentions métier sans les perturber', () => {
    const intents = ['period-review', ...buildOpenIntents({ route: '/(app)/finance', label: 'Voir' })];
    expect(parseOpenAction(intents)).toEqual({ route: '/(app)/finance', label: 'Voir' });
  });

  it('retombe sur un libellé lisible quand il manque', () => {
    expect(parseOpenAction(['open:/(app)/wars'])).toEqual({ route: '/(app)/wars', label: 'Ouvrir' });
  });

  it('ignore les messages sans action', () => {
    expect(parseOpenAction([])).toBeNull();
    expect(parseOpenAction(['brain-calc'])).toBeNull();
    expect(parseOpenAction(null)).toBeNull();
    expect(parseOpenAction(undefined)).toBeNull();
  });

  it('refuse une route vide ou ambiguë', () => {
    expect(buildOpenIntents({ route: '   ', label: 'x' })).toEqual([]);
    expect(buildOpenIntents({ route: 'https://example.com', label: 'x' })).toHaveLength(2);
    expect(buildOpenIntents({ route: '/(app)/a:b:c', label: 'x' })).toEqual([]);
  });

  it('nettoie les espaces autour du libellé', () => {
    const [, label] = buildOpenIntents({ route: '/(app)/home', label: '   Voir   ' });
    expect(parseOpenAction([label.replace('openlabel:', 'openlabel:'), 'open:/(app)/home'])?.label).toBe('Voir');
  });
});

describe('parseIntents', () => {
  it('décode un tableau JSON', () => {
    expect(parseIntents('["a","b"]')).toEqual(['a', 'b']);
  });

  it('ignore les valeurs non textuelles', () => {
    expect(parseIntents('["a",1,null,{"x":1}]')).toEqual(['a']);
  });

  it('ne lève jamais sur du JSON invalide', () => {
    expect(parseIntents('{')).toEqual([]);
    expect(parseIntents('"chaîne"')).toEqual([]);
    expect(parseIntents(null)).toEqual([]);
  });
});

describe('isInternalRoute', () => {
  it('accepte uniquement les écrans de l’application', () => {
    expect(isInternalRoute('/(app)/review')).toBe(true);
    expect(isInternalRoute('/(app)/settings')).toBe(true);
    expect(isInternalRoute('https://example.com')).toBe(false);
    expect(isInternalRoute('/(auth)/pin')).toBe(false);
    expect(isInternalRoute('/(app)/review?x=1')).toBe(false);
  });
});
