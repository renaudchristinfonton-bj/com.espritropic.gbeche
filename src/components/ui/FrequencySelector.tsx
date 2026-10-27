/**
 * GBECHE — Sélecteur de fréquence de récurrence.
 * Couvre toutes les fréquences du moteur, y compris l'intervalle libre
 * « tous les N jours » et les jours de semaine précis. Contrôle glass,
 * entièrement accessible (rôle bouton + libellés).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import type { Frequency } from '../../db/types';
import { WEEKDAY_LABELS } from '../../utils/calendar';

export interface FrequencyValue {
  frequency: Frequency;
  specificDays: number[];
  intervalDays: number;
}

export const DEFAULT_FREQUENCY: FrequencyValue = {
  frequency: 'daily',
  specificDays: [],
  intervalDays: 3,
};

const OPTIONS: { value: Frequency; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'once', label: 'Une fois', icon: 'flag-outline' },
  { value: 'daily', label: 'Chaque jour', icon: 'sunny-outline' },
  { value: 'interval_days', label: 'Tous les N jours', icon: 'repeat-outline' },
  { value: 'weekly', label: 'Hebdomadaire', icon: 'calendar-outline' },
  { value: 'specific_days', label: 'Jours précis', icon: 'calendar-number-outline' },
  { value: 'monthly', label: 'Mensuel', icon: 'calendar-clear-outline' },
  { value: 'yearly', label: 'Annuel', icon: 'trophy-outline' },
];

interface FrequencySelectorProps {
  value: FrequencyValue;
  onChange: (next: FrequencyValue) => void;
}

export function FrequencySelector({ value, onChange }: FrequencySelectorProps) {
  const { colors } = useTheme().theme;

  const toggleDay = (isoDay: number) => {
    const has = value.specificDays.includes(isoDay);
    const next = has
      ? value.specificDays.filter((d) => d !== isoDay)
      : [...value.specificDays, isoDay].sort((a, b) => a - b);
    onChange({ ...value, specificDays: next });
  };

  const setInterval = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    const parsed = Number(digits);
    onChange({
      ...value,
      intervalDays: Number.isFinite(parsed) && parsed >= 2 ? parsed : 0,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { color: colors.textMuted }]}>Récurrence</Text>
      <View style={styles.chipGrid}>
        {OPTIONS.map((option) => {
          const active = value.frequency === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => onChange({ ...value, frequency: option.value })}
              style={[
                styles.option,
                {
                  backgroundColor: active ? colors.primaryDim : colors.glass,
                  borderColor: active ? colors.primary : colors.glassBorder,
                },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={15}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text
                numberOfLines={1}
                style={{ color: active ? colors.primary : colors.text, fontSize: typography.sizes.sm, fontWeight: '700' }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value.frequency === 'interval_days' ? (
        <View style={[styles.intervalRow, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
          <Text style={[styles.intervalText, { color: colors.text }]}>Tous les</Text>
          <TextInput
            accessibilityLabel="Nombre de jours de l'intervalle"
            keyboardType="number-pad"
            value={value.intervalDays ? String(value.intervalDays) : ''}
            onChangeText={setInterval}
            placeholder="3"
            placeholderTextColor={colors.textTertiary}
            style={[styles.intervalInput, { color: colors.text, borderColor: colors.glassBorder }]}
            maxLength={3}
          />
          <Text style={[styles.intervalText, { color: colors.text }]}>jours</Text>
        </View>
      ) : null}

      {value.frequency === 'specific_days' ? (
        <View style={styles.dayRow}>
          {WEEKDAY_LABELS.map((label, index) => {
            const isoDay = index + 1;
            const active = value.specificDays.includes(isoDay);
            return (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}${active ? ', sélectionné' : ''}`}
                onPress={() => toggleDay(isoDay)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: active ? colors.primary : colors.glass,
                    borderColor: active ? colors.primary : colors.glassBorder,
                  },
                ]}
              >
                <Text style={{ color: active ? colors.textInverse : colors.text, fontWeight: '800', fontSize: typography.sizes.sm }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[4], gap: spacing[2] },
  caption: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    height: 52,
    marginTop: spacing[2],
  },
  intervalText: { fontSize: typography.sizes.md, fontWeight: '700' },
  intervalInput: {
    minWidth: 64,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    fontSize: typography.sizes.lg,
    fontWeight: '800',
  },
  dayRow: { flexDirection: 'row', gap: spacing[1.5], marginTop: spacing[2] },
  dayChip: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
