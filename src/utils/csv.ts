/**
 * GBECHE — Utilitaire CSV minimal et robuste (RFC 4180).
 * Pur, sans dépendance : gère les guillemets, les virgules et les
 * retours-ligne dans un champ, les guillemets échappés ("") et CRLF.
 */

/** Découpe un texte CSV en matrice de chaînes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const source = text.replace(/^\uFEFF/, ''); // tolère le BOM Excel
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      if (source[i + 1] === '\n') i += 1;
      pushRow();
    } else {
      field += char;
    }
  }

  // Dernier champ / dernière ligne (même sans saut de ligne final).
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((cells) => !(cells.length === 1 && cells[0].trim() === ''));
}

/** Échappe une cellule selon les règles CSV. */
function escapeCell(value: string | number): string {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Sérialise une matrice en texte CSV (fin de ligne \n). */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}

const normalizeHeader = (header: string): string =>
  header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Parse un CSV avec ligne d'en-tête et renvoie des enregistrements
 * typés via les en-têtes normalisés (accents retirés, espaces → _).
 */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const matrix = parseCsv(text);
  if (matrix.length === 0) return [];

  const headers = matrix[0].map(normalizeHeader);
  return matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim();
    });
    return record;
  });
}
