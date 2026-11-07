import { backupTimestamp, selectBackupsToPrune, type BackupFileMeta } from '../backupRotation';

describe('selectBackupsToPrune', () => {
  const file = (name: string, modifiedAt: number): BackupFileMeta => ({ name, modifiedAt });

  test('ne supprime rien quand la limite n’est pas atteinte', () => {
    const files = [
      file('gbeche-auto-20261023-090000.json', 1),
      file('gbeche-auto-20261024-090000.json', 2),
    ];
    expect(selectBackupsToPrune(files)).toEqual([]);
  });

  test('élimine les plus vieux au-delà de 3 instantanés', () => {
    const files = [
      file('gbeche-auto-20261020-090000.json', 10),
      file('gbeche-auto-20261021-090000.json', 20),
      file('gbeche-auto-20261022-090000.json', 30),
      file('gbeche-auto-20261023-090000.json', 40),
      file('gbeche-auto-20261024-090000.json', 50),
    ];
    expect(selectBackupsToPrune(files)).toEqual([
      'gbeche-auto-20261020-090000.json',
      'gbeche-auto-20261021-090000.json',
    ]);
  });

  test('ignore les fichiers qui ne suivent pas la convention', () => {
    const files = [
      file('gbeche-sauvegarde-20261024.json', 1),
      file('gbeche-auto-20261024-090000.json', 2),
      file('notes.txt', 3),
    ];
    expect(selectBackupsToPrune(files, 0)).toEqual(['gbeche-auto-20261024-090000.json']);
  });

  test('se fie à la date de modification, pas à lordre du tableau', () => {
    const files = [
      file('gbeche-auto-20261024-090000.json', 50),
      file('gbeche-auto-20261020-090000.json', 10),
      file('gbeche-auto-20261022-090000.json', 30),
    ];
    expect(selectBackupsToPrune(files, 2)).toEqual(['gbeche-auto-20261020-090000.json']);
  });
});

describe('backupTimestamp', () => {
  test('produit un horodatage YYYYMMDD-HHmmss triable', () => {
    const stamp = backupTimestamp(new Date(2026, 9, 5, 7, 8, 9));
    expect(stamp).toBe('20261005-070809');
    expect(/^\d{8}-\d{6}$/.test(stamp)).toBe(true);
  });
});
