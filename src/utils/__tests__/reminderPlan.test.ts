import {
  MAX_SCHEDULED_REMINDERS,
  planReminderSync,
  type DesiredReminder,
  type ScheduledMap,
} from '../reminderPlan';

const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);
const HOUR = 3_600_000;

function reminder(id: string, at: number): DesiredReminder {
  return { id, title: `Mission ${id}`, body: 'contexte', at };
}

describe('planReminderSync', () => {
  test('planifie toutes les instances quand rien n’existe encore', () => {
    const desired = [reminder('a', NOW + HOUR), reminder('b', NOW + 2 * HOUR)];
    const plan = planReminderSync({}, desired, NOW);

    expect(plan.cancel).toHaveLength(0);
    expect(plan.schedule.map((item) => item.id)).toEqual(['a', 'b']);
    expect(plan.nextMap).toEqual({});
  });

  test('conserve les notifications déjà programmées à la même heure', () => {
    const current: ScheduledMap = {
      a: { nid: 'notif-a', at: NOW + HOUR },
    };
    const desired = [reminder('a', NOW + HOUR), reminder('b', NOW + 2 * HOUR)];
    const plan = planReminderSync(current, desired, NOW);

    expect(plan.cancel).toHaveLength(0);
    expect(plan.schedule.map((item) => item.id)).toEqual(['b']);
    expect(plan.nextMap.a).toEqual({ nid: 'notif-a', at: NOW + HOUR });
  });

  test('annule et reprogramme quand lheure a changé', () => {
    const current: ScheduledMap = {
      a: { nid: 'notif-a', at: NOW + HOUR },
    };
    const desired = [reminder('a', NOW + 3 * HOUR)];
    const plan = planReminderSync(current, desired, NOW);

    expect(plan.cancel).toEqual([{ key: 'a', nid: 'notif-a' }]);
    expect(plan.schedule.map((item) => item.id)).toEqual(['a']);
    expect(plan.nextMap.a).toBeUndefined();
  });

  test('annule les notifications devenues inutiles', () => {
    const current: ScheduledMap = {
      a: { nid: 'notif-a', at: NOW + HOUR },
      b: { nid: 'notif-b', at: NOW + 2 * HOUR },
    };
    // La mission b a été gagnée/supprimée : elle n'est plus désirée.
    const desired = [reminder('a', NOW + HOUR)];
    const plan = planReminderSync(current, desired, NOW);

    expect(plan.cancel).toEqual([{ key: 'b', nid: 'notif-b' }]);
    expect(plan.schedule).toHaveLength(0);
    expect(plan.nextMap.a).toEqual({ nid: 'notif-a', at: NOW + HOUR });
  });

  test('ignore les instances déjà passées et borne la file', () => {
    const desired: DesiredReminder[] = [
      reminder('past', NOW - HOUR),
      ...Array.from({ length: MAX_SCHEDULED_REMINDERS + 10 }, (_, index) =>
        reminder(`f${index}`, NOW + (index + 1) * HOUR),
      ),
    ];
    const plan = planReminderSync({}, desired, NOW);

    expect(plan.schedule).toHaveLength(MAX_SCHEDULED_REMINDERS);
    expect(plan.schedule.some((item) => item.id === 'past')).toBe(false);
  });
});
