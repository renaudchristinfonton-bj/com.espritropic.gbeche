import type { AdversaryRow, WarRow } from '@/src/db/types';
import { warWeeklyHistory } from '../warHistory';

const NOW = new Date(2026, 10, 6, 12).getTime();
const DAY = 86_400_000;
const WAR: WarRow = {
  id: 'war-a', title: 'Santé', icon: 'flame', color: '#00E5FF',
  domain_type: 'health', xp_earned: 0, is_active: 1, sort_order: 0,
  created_at: NOW, updated_at: NOW,
};
let id = 0;
function mission(status: AdversaryRow['status'], at: number, warId = WAR.id): AdversaryRow {
  id += 1;
  return {
    id: `mission-${id}`, template_id: null, battle_id: `battle-${warId}`, war_id: warId,
    title: 'Mission', xp_reward: 12, scheduled_at: at, hour: 8, minute: 0,
    duration_min: 10, status, completed_at: status === 'won' ? at : null,
    created_at: at, updated_at: at,
  };
}

describe('warWeeklyHistory', () => {
  it('renvoie les semaines de la plus ancienne à la courante', () => {
    const weeks = warWeeklyHistory([], WAR, NOW, 4);
    expect(weeks.map((week) => week.label)).toEqual(['S-3', 'S-2', 'S-1', 'Cette sem.']);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].to).toBe(NOW);
  });

  it('produit des fenêtres contiguës sans double comptage', () => {
    const weeks = warWeeklyHistory([], WAR, NOW, 6);
    for (let index = 1; index < weeks.length; index += 1) {
      expect(weeks[index].from).toBe(weeks[index - 1].to + 1);
    }
  });

  it('groupe les victoires, défaites, XP et attente par semaine', () => {
    const rows = [
      mission('won', NOW - DAY),
      mission('lost', NOW - 2 * DAY),
      mission('pending', NOW - 3 * DAY),
      mission('won', NOW - 9 * DAY),
    ];
    const weeks = warWeeklyHistory(rows, WAR, NOW, 3);
    expect(weeks[1]).toMatchObject({ wins: 1, losses: 0, pending: 0, xp: 12, completionRate: 1 });
    expect(weeks[2]).toMatchObject({ wins: 1, losses: 1, pending: 1, xp: 12, completionRate: 0.5 });
  });

  it('garde des semaines vides et ne fabrique pas de taux', () => {
    const weeks = warWeeklyHistory([], WAR, NOW, 2);
    expect(weeks[0]).toMatchObject({ wins: 0, losses: 0, pending: 0, total: 0, xp: 0, completionRate: null });
    expect(weeks[1].completionRate).toBeNull();
  });

  it('isole la guerre demandée', () => {
    const rows = [mission('lost', NOW - DAY, 'war-b'), mission('won', NOW - DAY)];
    expect(warWeeklyHistory(rows, WAR, NOW, 1)[0]).toMatchObject({ wins: 1, losses: 0, completionRate: 1 });
  });

  it('borne la demande à 1..52 semaines', () => {
    expect(warWeeklyHistory([], WAR, NOW, 0)).toHaveLength(1);
    expect(warWeeklyHistory([], WAR, NOW, 500)).toHaveLength(52);
  });
});
