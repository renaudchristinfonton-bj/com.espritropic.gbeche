import {
  detectIntent,
  generateReply,
  welcomeMessage,
  type AgentContext,
} from '../agent.service';

const ctx: AgentContext = {
  balance: 125000,
  pendingToday: 3,
  wonToday: 2,
  level: 4,
  streak: 7,
  activeWars: 5,
};

describe('detectIntent', () => {
  test.each([
    ['Bonjour chef', 'greeting'],
    ['quel est mon SOLDE ?', 'balance'],
    ['mes missions du jour', 'today'],
    ['fais le point sur mes guerres', 'wars'],
    ['je veux mieux épargner', 'expense'],
    ['je suis fatigué, envie d’abandonner', 'motivation'],
    ['ma série de jours', 'streak'],
    ['à l’aide, comment ça marche', 'help'],
    ['merci beaucoup', 'thanks'],
    ['xyz qwerty', 'unknown'],
  ])('« %s » → %s', (input, expected) => {
    expect(detectIntent(input)).toBe(expected);
  });

  test('gère les accents et la casse', () => {
    expect(detectIntent('DEPENSE')).toBe('expense');
    expect(detectIntent('  Bonsoir  ')).toBe('greeting');
  });
});

describe('generateReply', () => {
  test('injecte les chiffres réels du contexte (solde)', () => {
    const reply = generateReply('mon solde', ctx);
    expect(reply.intent).toBe('balance');
    expect(reply.text).toContain('125 000 FCFA');
  });

  test('reflète les missions restantes et gagnées du jour', () => {
    const reply = generateReply('quelles missions aujourd’hui ?', ctx);
    expect(reply.text).toContain('3');
    expect(reply.text).toContain('2');
  });

  test('répond toujours quelque chose, même en intention inconnue', () => {
    const reply = generateReply('parapluie lunaire', {});
    expect(reply.intent).toBe('unknown');
    expect(reply.text.length).toBeGreaterThan(10);
    expect(Array.isArray(reply.suggestions)).toBe(true);
  });

  test('détermine le contexte sans compte financier', () => {
    const reply = generateReply('quel solde ?', { balance: null });
    expect(reply.text).toContain('Aucun compte');
  });

  test('est déterministe pour un même message', () => {
    const a = generateReply('je suis découragé', ctx);
    const b = generateReply('je suis découragé', ctx);
    expect(a.text).toBe(b.text);
  });

  test('couvre le cas sans mission du jour', () => {
    const reply = generateReply('programme du jour', { pendingToday: 0, wonToday: 0 });
    expect(reply.text).toContain('Aucune mission');
  });
});

describe('welcomeMessage', () => {
  test('annonce les missions en attente', () => {
    expect(welcomeMessage({ pendingToday: 4 })).toContain('4');
  });

  test('reste utile sans contexte', () => {
    expect(welcomeMessage().length).toBeGreaterThan(10);
  });
});
