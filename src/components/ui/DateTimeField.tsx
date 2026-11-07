/**
 * GBECHE — Champ date + heure de précision minute, 100 % maison.
 *
 * Aucune dépendance native de picker : une sheet glass contient un
 * calendrier mensuel (navigation année/mois, semaine lundi..dimanche) et
 * deux colonnes défilantes heures/minutes. L'utilisateur garde donc le
 * contrôle total du jour, de l'année, de l'heure et de la minute.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { buildMonthGrid, sameDay, WEEKDAY_LABELS, type CalendarCell } from '../../utils/calendar';
import { formatDate, formatTime } from '../../services/format';
import * as Haptics from '../../services/haptics';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface DateTimeFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  /** N'autorise que le choix d'une date (pas d'heure). */
  dateOnly?: boolean;
  /** Les dates antérieures à cette valeur sont désactivées. */
  minimumDate?: Date;
}

function mergeDateTime(datePart: Date, timePart: Date): Date {
  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes(),
    0,
    0,
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  icon = 'calendar-outline',
  placeholder = 'Choisir une date et une heure',
  dateOnly = false,
  minimumDate,
}: DateTimeFieldProps) {
  const { colors } = useTheme().theme;
  const [open, setOpen] = useState(false);

  // État de travail de la sheet (on n'écrit la valeur qu'à la confirmation).
  const [working, setWorking] = useState<Date>(() => value ?? new Date());
  const [viewYear, setViewYear] = useState(() => (value ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (value ?? new Date()).getMonth());

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, working),
    [viewYear, viewMonth, working],
  );
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const openPicker = () => {
    const base = value ?? new Date();
    setWorking(base);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  const shiftMonth = (direction: number) => {
    Haptics.selectionAsync().catch(() => {});
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const shiftYear = (direction: number) => {
    Haptics.selectionAsync().catch(() => {});
    setViewYear((y) => y + direction);
  };

  const selectDay = (cell: CalendarCell) => {
    if (minimumDate && cell.timestamp < new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()).getTime()) {
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setWorking((current) => mergeDateTime(new Date(cell.timestamp), current));
  };

  const selectHour = (hour: number) => {
    Haptics.selectionAsync().catch(() => {});
    setWorking((current) => {
      const next = new Date(current);
      next.setHours(hour);
      return next;
    });
  };

  const selectMinute = (minute: number) => {
    Haptics.selectionAsync().catch(() => {});
    setWorking((current) => {
      const next = new Date(current);
      next.setMinutes(minute);
      return next;
    });
  };

  const confirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onChange(working);
    setOpen(false);
  };

  const disabledDay = (cell: CalendarCell): boolean => {
    if (!minimumDate) return false;
    const minStart = new Date(
      minimumDate.getFullYear(),
      minimumDate.getMonth(),
      minimumDate.getDate(),
    ).getTime();
    return cell.timestamp < minStart;
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.glass,
            borderColor: open ? colors.primary : colors.glassBorder,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={open ? colors.primary : colors.textMuted} />
        {value ? (
          <Text style={[styles.valueText, { color: colors.text }]}>
            {formatDate(value.getTime())}
            {dateOnly ? '' : ` · ${formatTime(value.getTime())}`}
          </Text>
        ) : (
          <Text style={[styles.valueText, { color: colors.textTertiary }]}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Sheet visible={open} title="Date et heure" onClose={() => setOpen(false)} scroll maxHeight="86%">
        {/* Navigation mois / année */}
        <View style={styles.calendarHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mois précédent"
            onPress={() => shiftMonth(-1)}
            hitSlop={10}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mois suivant"
            onPress={() => shiftMonth(1)}
            hitSlop={10}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.yearRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Année précédente"
            onPress={() => shiftYear(-1)}
            style={[styles.yearBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            hitSlop={8}
          >
            <Ionicons name="remove" size={16} color={colors.primary} />
          </Pressable>
          <Text style={[styles.yearText, { color: colors.primary }]}>{viewYear}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Année suivante"
            onPress={() => shiftYear(1)}
            style={[styles.yearBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* Grille calendrier */}
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((day) => (
            <Text key={day} style={[styles.weekDay, { color: colors.textTertiary }]}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((cell) => {
            const selected = sameDay(new Date(cell.timestamp), working);
            const disabled = disabledDay(cell);
            return (
              <Pressable
                key={cell.timestamp}
                accessibilityRole="button"
                accessibilityLabel={`${cell.day} ${monthLabel}`}
                disabled={disabled}
                onPress={() => selectDay(cell)}
                style={[
                  styles.cell,
                  selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !cell.inMonth && !selected && { opacity: 0.32 },
                  disabled && { opacity: 0.18 },
                  !selected && { borderColor: 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    {
                      color: selected
                        ? colors.textInverse
                        : cell.isToday
                          ? colors.primary
                          : colors.text,
                    },
                  ]}
                >
                  {cell.day}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Heures et minutes */}
        {!dateOnly ? (
          <View style={styles.timeSection}>
            <View style={styles.timeColumn}>
              <Text style={[styles.timeCaption, { color: colors.textMuted }]}>Heure</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeScroll}
              >
                {HOURS.map((hour) => {
                  const active = working.getHours() === hour;
                  return (
                    <Pressable
                      key={`h-${hour}`}
                      accessibilityRole="button"
                      onPress={() => selectHour(hour)}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: active ? colors.primary : colors.glass,
                          borderColor: active ? colors.primary : colors.glassBorder,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.textInverse : colors.text, fontWeight: '700' }}>
                        {String(hour).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.timeColumn}>
              <Text style={[styles.timeCaption, { color: colors.textMuted }]}>Minute</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeScroll}
              >
                {MINUTES.map((minute) => {
                  const active = working.getMinutes() === minute;
                  return (
                    <Pressable
                      key={`m-${minute}`}
                      accessibilityRole="button"
                      onPress={() => selectMinute(minute)}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: active ? colors.primary : colors.glass,
                          borderColor: active ? colors.primary : colors.glassBorder,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.textInverse : colors.text, fontWeight: '700' }}>
                        {String(minute).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : null}

        <Button
          label={dateOnly ? 'Confirmer la date' : 'Confirmer la date et l’heure'}
          fullWidth
          onPress={confirm}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[4] },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  valueText: { flex: 1, fontSize: typography.sizes.md, fontWeight: '600' },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  navBtn: { padding: spacing[2] },
  monthLabel: { fontSize: typography.sizes.lg, fontWeight: '800', textTransform: 'capitalize' },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: { fontSize: typography.sizes.lg, fontWeight: '800', minWidth: 64, textAlign: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: spacing[1] },
  weekDay: { flex: 1, textAlign: 'center', fontSize: typography.sizes.xs, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
  },
  cellText: { fontSize: typography.sizes.md, fontWeight: '700' },
  timeSection: { gap: spacing[3], marginVertical: spacing[3] },
  timeColumn: { gap: spacing[1.5] },
  timeCaption: { fontSize: typography.sizes.xs, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  timeScroll: { gap: spacing[2], paddingVertical: 2 },
  timeChip: {
    minWidth: 46,
    height: 40,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
