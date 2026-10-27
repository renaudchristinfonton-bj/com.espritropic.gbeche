import { parseCsv, parseCsvRecords, toCsv } from '../csv';

describe('parseCsv', () => {
  test('découpe des lignes simples', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  test('gère les virgules dans un champ quoté', () => {
    expect(parseCsv('nom,note\n"Durand, Jean",ok')).toEqual([
      ['nom', 'note'],
      ['Durand, Jean', 'ok'],
    ]);
  });

  test('gère les guillemets échappés et les retours-ligne dans un champ', () => {
    expect(parseCsv('titre,desc\n"Un ""titre""","ligne1\nligne2"')).toEqual([
      ['titre', 'desc'],
      ['Un "titre"', 'ligne1\nligne2'],
    ]);
  });

  test('tolère CRLF, le BOM Excel et les lignes vides', () => {
    const result = parseCsv('\uFEFFa,b\r\n1,2\r\n\r\n3,4\r\n');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  test('retourne une matrice vide pour un texte vide', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('toCsv', () => {
  test('échappe automatiquement les champs à virgule / guillemet / saut de ligne', () => {
    const csv = toCsv([
      ['type', 'guerre'],
      ['adversaire', 'Course, 10 km'],
      ['note', 'Il a dit "go"'],
    ]);
    expect(csv).toBe('type,guerre\nadversaire,"Course, 10 km"\nnote,"Il a dit ""go"""');
  });

  test('round-trip parse → sérialise → parse', () => {
    const original = [
      ['type', 'montant', 'libellé'],
      ['depense', '15000', 'Taxi, course rapide'],
    ];
    expect(parseCsv(toCsv(original))).toEqual(original);
  });
});

describe('parseCsvRecords', () => {
  test('normalise les en-têtes (accents, espaces, casse)', () => {
    const records = parseCsvRecords('Type,Guerre, Couleur guerre\nguerre,Santé,#00FF88');
    expect(records[0]).toEqual({
      type: 'guerre',
      guerre: 'Santé',
      couleur_guerre: '#00FF88',
    });
  });

  test('retourne [] sans ligne de données', () => {
    expect(parseCsvRecords('type,guerre')).toEqual([]);
  });
});
