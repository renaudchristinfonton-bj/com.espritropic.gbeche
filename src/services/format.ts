/**
 * GBECHE — Formatage FR : dates, nombres, devises.
 */

export function formatCurrency(amount: number, currency = 'XOF'): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('fr-FR', {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(rounded);
  const suffix = currency === 'XOF' ? 'FCFA' : currency;
  return `${formatted} ${suffix}`;
}

export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} M`;
  }
  if (abs >= 10_000) {
    return `${Math.round(amount / 1000)} k`;
  }
  return `${Math.round(amount)}`;
}

export function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function monthKey(ms: number): string {
  const d = new Date(ms);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
}

export function monthLabel(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

export function currentMonthKey(): string {
  return monthKey(Date.now());
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const ms1 = Date.UTC(y1, m1 - 1, d1);
  const ms2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((ms2 - ms1) / (24 * 60 * 60 * 1000));
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
