import { MOTION, enterDelay, motionDuration } from '../motion';

describe('motionDuration', () => {
  it('renvoie la durée demandée en mouvement normal', () => {
    expect(motionDuration(MOTION.normal, false)).toBe(260);
    expect(motionDuration(0, false)).toBe(0);
  });

  it('annule toute animation quand « réduire les animations » est actif', () => {
    expect(motionDuration(MOTION.slower, true)).toBe(0);
    expect(motionDuration(500, null)).toBe(500);
  });

  it('protège contre les durées invalides', () => {
    expect(motionDuration(-40, false)).toBe(0);
    expect(motionDuration(Number.NaN, false)).toBe(0);
  });
});

describe('enterDelay', () => {
  it('cascade les éléments', () => {
    expect(enterDelay(0, false)).toBe(0);
    expect(enterDelay(3, false)).toBe(135);
  });

  it('plafonne le retard pour ne jamais ralentir la lecture', () => {
    expect(enterDelay(50, false)).toBe(240);
    expect(enterDelay(50, false, 45, 120)).toBe(120);
  });

  it('ne retarde rien en mouvement réduit', () => {
    expect(enterDelay(12, true)).toBe(0);
  });

  it('tolère les index invalides', () => {
    expect(enterDelay(-3, false)).toBe(0);
    expect(enterDelay(Number.NaN, false)).toBe(0);
  });
});
