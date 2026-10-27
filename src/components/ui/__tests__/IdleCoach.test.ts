/**
 * Test de la logique pure du coach d'inactivité : la proposition doit
 * correspondre à l'écran courant et rester muette sur la conversation.
 */
import { coachTipForPath } from '../IdleCoach';

describe('coachTipForPath', () => {
  test('propose une action propre à chaque écran principal', () => {
    expect(coachTipForPath('/home')?.text).toMatch(/mission/i);
    expect(coachTipForPath('/calendar')?.text).toMatch(/planifier/i);
    expect(coachTipForPath('/wars')?.text).toMatch(/guerre/i);
    expect(coachTipForPath('/finance')?.text).toMatch(/dépense|revenu/i);
    expect(coachTipForPath('/settings')?.text).toMatch(/rappels|notifications/i);
  });

  test('reste muet sur la conversation et les données', () => {
    expect(coachTipForPath('/agent')).toBeNull();
    expect(coachTipForPath('/data')).toBeNull();
  });

  test('toutes les astuces mènent vers l assistant', () => {
    for (const path of ['/home', '/calendar', '/wars', '/finance', '/settings']) {
      expect(coachTipForPath(path)?.route).toBe('/(app)/agent');
    }
  });

  test('un chemin inconnu ne propose rien', () => {
    expect(coachTipForPath('/inconnu')).toBeNull();
  });
});
