/**
 * Les graphes sont des images pour les lecteurs d'écran : leur résumé doit
 * être exact, court et sans valeur technique.
 */
import { describeBars } from '../BarChart';
import { describeSlices } from '../DonutChart';

const fmt = (value: number) => `${value} FCFA`;

describe('describeBars', () => {
  it('décrit les barres non nulles', () => {
    const text = describeBars(
      [
        { label: 'lun', value: 5000 },
        { label: 'mar', value: 0 },
        { label: 'mer', value: 1200 },
      ],
      fmt,
    );
    expect(text).toContain('lun 5000 FCFA');
    expect(text).toContain('mer 1200 FCFA');
    expect(text).not.toContain('mar');
  });

  it('plafonne à cinq valeurs pour rester écoutable', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ label: `j${i}`, value: i + 1 }));
    const commas = describeBars(data, fmt).split(',').length;
    expect(commas).toBeLessThanOrEqual(5);
  });

  it('gère le vide et le tout-zéro', () => {
    expect(describeBars([], fmt)).toContain('Aucune donnée');
    expect(describeBars([{ label: 'lun', value: 0 }], fmt)).toContain('zéro');
  });

  it('remplace un libellé vide', () => {
    expect(describeBars([{ label: '  ', value: 10 }], fmt)).toContain('sans libellé');
  });
});

describe('describeSlices', () => {
  it('donne des pourcentages entiers', () => {
    const text = describeSlices([
      { label: 'Alimentation', value: 7500, color: '#f00' },
      { label: 'Transport', value: 2500, color: '#0f0' },
    ]);
    expect(text).toContain('Alimentation 75 %');
    expect(text).toContain('Transport 25 %');
  });

  it('classe de la plus grosse part à la plus petite', () => {
    const text = describeSlices([
      { label: 'Petit', value: 10, color: '#0f0' },
      { label: 'Gros', value: 90, color: '#f00' },
    ]);
    expect(text.indexOf('Gros')).toBeLessThan(text.indexOf('Petit'));
  });

  it('plafonne à quatre tranches', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({ label: `c${i}`, value: i + 1, color: '#fff' }));
    expect(describeSlices(data).split(',').length).toBeLessThanOrEqual(4);
  });

  it('gère le vide', () => {
    expect(describeSlices([])).toContain('vide');
    expect(describeSlices([{ label: 'x', value: 0, color: '#fff' }])).toContain('vide');
  });
});
