/**
 * GBECHE — HeatMap
 * Grille d'activité 90 jours style GitHub contributions.
 * Couleurs : vert → cyan selon l'intensité.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useTheme } from '@/src/theme/ThemeContext';

// ─── Types ────────────────────────────────────────────────

export interface HeatMapDay {
  date:  string;   // 'YYYY-MM-DD'
  value: number;   // 0-4 (intensity level)
}

interface HeatMapProps {
  data:      HeatMapDay[];
  days?:     number;    // number of days to show (default 90)
  cellSize?: number;
  gap?:      number;
  showMonths?: boolean;
}

// ─── Color Scale ──────────────────────────────────────────

const COLORS = [
  'rgba(255,255,255,0.05)',  // 0 - empty
  'rgba(0,229,255,0.2)',     // 1 - low
  'rgba(0,229,255,0.45)',    // 2 - medium
  'rgba(0,229,255,0.75)',    // 3 - high
  '#00E5FF',                  // 4 - max
];

const DAYS_OF_WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// ─── Helpers ──────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Component ────────────────────────────────────────────

export function HeatMap({
  data,
  days       = 90,
  cellSize   = 12,
  gap        = 3,
  showMonths = true,
}: HeatMapProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  // Build lookup map
  const lookup = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach(d => { m[d.date] = d.value; });
    return m;
  }, [data]);

  // Generate grid: fill from (days) ago to today, padded to full weeks
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start = (days) ago, aligned to Sunday
    const startDate = addDays(today, -(days - 1));
    const dayOfWeek = startDate.getDay(); // 0=Sun
    const gridStart = addDays(startDate, -dayOfWeek);

    // Total cells (multiple of 7)
    const totalDays = Math.ceil((days + dayOfWeek) / 7) * 7;

    const allDays: Array<{ date: string; value: number; inRange: boolean; month: number }> = [];
    for (let i = 0; i < totalDays; i++) {
      const d    = addDays(gridStart, i);
      const key  = formatDate(d);
      const inR  = d >= startDate && d <= today;
      allDays.push({ date: key, value: lookup[key] ?? 0, inRange: inR, month: d.getMonth() });
    }

    // Group into weeks (columns)
    const weeks: typeof allDays[] = [];
    for (let w = 0; w < totalDays / 7; w++) {
      weeks.push(allDays.slice(w * 7, w * 7 + 7));
    }

    // Month labels
    const seen = new Set<number>();
    const mLabels: Array<{ col: number; label: string }> = [];
    weeks.forEach((week, col) => {
      const month = week[0].month;
      if (!seen.has(month)) {
        seen.add(month);
        const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        mLabels.push({ col, label: MONTHS[month] });
      }
    });

    return { grid: weeks, monthLabels: mLabels };
  }, [data, days, lookup]);

  const totalActivity = useMemo(() =>
    data.reduce((sum, d) => sum + (d.value > 0 ? 1 : 0), 0), [data]);

  const colWidth = cellSize + gap;

  return (
    <View style={styles.wrapper}>
      {/* Month labels */}
      {showMonths && (
        <View style={[styles.monthRow, { marginLeft: 20 }]}>
          {monthLabels.map((ml) => (
            <Text
              key={ml.col}
              style={[
                styles.monthLabel,
                { color: colors.textMuted, left: ml.col * colWidth },
              ]}
            >
              {ml.label}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.gridRow}>
        {/* Day-of-week labels */}
        <View style={styles.dayLabels}>
          {DAYS_OF_WEEK.map((d, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.textMuted }]}>
              {i % 2 === 0 ? d : ''}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap }}>
            {grid.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'column', gap }}>
                {week.map((day, di) => (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      {
                        width:        cellSize,
                        height:       cellSize,
                        borderRadius: cellSize * 0.25,
                        backgroundColor: day.inRange
                          ? COLORS[Math.min(day.value, 4)]
                          : 'transparent',
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>
          {totalActivity} jours actifs
        </Text>
        <View style={styles.legendScale}>
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Moins</Text>
          {COLORS.map((c, i) => (
            <View
              key={i}
              style={[
                styles.legendCell,
                { backgroundColor: c, borderRadius: 3 },
              ]}
            />
          ))}
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Plus</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper:   { width: '100%' },
  monthRow:  { flexDirection: 'row', position: 'relative', height: 16, marginBottom: 4 },
  monthLabel:{ position: 'absolute', fontSize: 9, fontWeight: '600' },
  gridRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  dayLabels: { flexDirection: 'column', gap: 3, marginRight: 4, paddingTop: 0 },
  dayLabel:  { fontSize: 8, fontWeight: '600', height: 12, lineHeight: 12 },
  cell:      { borderWidth: 0 },
  legend: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      10,
  },
  legendScale: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  legendCell:  { width: 10, height: 10 },
  legendText:  { fontSize: 9, fontWeight: '600' },
});
