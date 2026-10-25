/**
 * GBECHE — Dashboard « Quartier Général ».
 * 100 % données réelles SQLite : progression du jour, finances, streak,
 * adversaires du jour (tap = victoire), progression par guerre.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from '@/src/services/haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { StatCard } from '@/src/components/ui/StatCard';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { ProgressRing } from '@/src/components/ui/XPBar';
import { FAB } from '@/src/components/ui/FAB';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import {
  getDayStats,
  getWarProgress,
  listInstancesForDay,
} from '@/src/db/repositories/adversaries.repo';
import { listWars } from '@/src/db/repositories/wars.repo';
import { getTotalBalance } from '@/src/db/repositories/accounts.repo';
import { getWarriorProfile, rankForLevel, winAdversary } from '@/src/services/gamification.service';
import { getTodayExpense } from '@/src/services/finance.service';
import { useAppStore } from '@/src/store/useAppStore';
import { formatCurrency, formatDateLong, formatTime, greeting } from '@/src/services/format';
import { radius, spacing, typography } from '@/src/theme';
import type { AdversaryRow } from '@/src/db/types';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const showXpFeedback = useAppStore((s) => s.showXpFeedback);

  const dayStats = useRepoQuery(() => getDayStats(new Date()), []);
  const todayInstances = useRepoQuery(() => listInstancesForDay(new Date()), []);
  const wars = useRepoQuery(() => listWars(true), []);
  const warProgress = useRepoQuery(() => getWarProgress(), []);
  const balance = useRepoQuery(() => getTotalBalance(), []);
  const todayExpense = useRepoQuery(() => getTodayExpense(), []);
  const profile = useRepoQuery(() => getWarriorProfile(), []);

  const instances = todayInstances.data ?? [];
  const stats = dayStats.data ?? { total: 0, won: 0, pending: 0, lost: 0 };
  const progress = stats.total ? stats.won / stats.total : 0;

  const handleWin = async (adversary: AdversaryRow) => {
    if (adversary.status === 'won') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await winAdversary(adversary.id);
    showXpFeedback({
      xpGained: result.xpGained,
      multiplier: result.multiplier,
      combo: result.combo,
      leveledUp: result.leveledUp,
    });
  };

  const progressByWar = new Map((warProgress.data ?? []).map((row) => [row.war_id, row]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen
        scroll
        padded={false}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: 120 }}
      >
        {/* En-tête */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textMuted }]}>
                {greeting()},
              </Text>
              <Text style={[styles.date, { color: colors.text }]}>
                {formatDateLong(Date.now())}
              </Text>
            </View>
            <View style={styles.headerChips}>
              <View style={[styles.chip, { backgroundColor: colors.warningBg, borderColor: colors.glassBorder }]}>
                <Ionicons name="flame" size={15} color={colors.streakColor} />
                <Text style={[styles.chipText, { color: colors.streakColor }]}>
                  {profile.data?.streak ?? 0} j
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.primaryDim, borderColor: colors.glassBorder }]}>
                <Ionicons name="shield-half" size={15} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  Niv. {profile.data?.level ?? 1}
                </Text>
              </View>
            </View>
          </View>

          {/* Anneau du jour */}
          <GlassCard elevated noPadding style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(0,229,255,0.10)', 'rgba(99,102,241,0.06)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <ProgressRing
                size={148}
                strokeWidth={11}
                progress={progress}
                color={colors.primary}
                label={`${Math.round(progress * 100)}%`}
                sublabel="du jour"
              />
              <View style={styles.heroLegend}>
                <Text style={[styles.rank, { color: colors.text }]}>
                  {rankForLevel(profile.data?.level ?? 1)}
                </Text>
                <Text style={[styles.heroMeta, { color: colors.textMuted }]}>
                  {stats.won} victoires · {stats.pending} à mener
                </Text>
                <Text style={[styles.heroXp, { color: colors.xp }]}>
                  {profile.data?.xp ?? 0} XP · {profile.data?.wins ?? 0} batailles gagnées
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Stats clés */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="wallet"
              label="Solde total"
              value={formatCurrency(balance.data ?? 0)}
              accent={colors.warning}
            />
            <StatCard
              icon="trending-down"
              label="Dépenses du jour"
              value={formatCurrency(todayExpense.data ?? 0)}
              accent={colors.danger}
            />
          </View>

          {/* Ordre de bataille */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ordre de bataille</Text>
            <Pressable onPress={() => router.push('/(app)/wars')} hitSlop={10}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Tout voir</Text>
            </Pressable>
          </View>

          {instances.length === 0 ? (
            <EmptyState
              icon="flag-outline"
              title="Aucun adversaire aujourd'hui"
              description="Crée une bataille et programme tes premiers adversaires depuis l'onglet Guerres."
              actionLabel="Aller aux Guerres"
              onAction={() => router.push('/(app)/wars')}
            />
          ) : (
            <View style={{ gap: spacing[2.5] }}>
              {instances.map((adversary) => (
                <TaskRow key={adversary.id} adversary={adversary} onWin={() => handleWin(adversary)} />
              ))}
            </View>
          )}

          {/* Progression des guerres */}
          <View style={[styles.sectionHead, { marginTop: spacing[8] }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes guerres</Text>
          </View>
          <GlassCard style={{ gap: spacing[4] }} animated={false}>
            {(wars.data ?? []).slice(0, 5).map((war) => {
              const row = progressByWar.get(war.id);
              const total = row?.total ?? 0;
              const won = row?.won ?? 0;
              const percent = total ? won / total : 0;
              return (
                <Pressable
                  key={war.id}
                  onPress={() => router.push('/(app)/wars')}
                  style={styles.warRow}
                >
                  <View style={[styles.warIcon, { backgroundColor: `${war.color}1A` }]}>
                    <Ionicons name={war.icon as never} size={18} color={war.color} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.warLabelRow}>
                      <Text style={[styles.warName, { color: colors.text }]}>{war.title}</Text>
                      <Text style={[styles.warCount, { color: colors.textMuted }]}>
                        {won}/{total}
                      </Text>
                    </View>
                    <ProgressBar progress={percent} color={war.color} height={6} />
                  </View>
                </Pressable>
              );
            })}
          </GlassCard>
      </Screen>

      <FAB
        actions={[
          { key: 'expense', label: 'Dépense rapide', icon: 'arrow-down-circle', color: colors.danger },
          { key: 'income', label: 'Revenu rapide', icon: 'arrow-up-circle', color: colors.success },
          { key: 'battle', label: 'Nouvelle bataille', icon: 'flag', color: colors.primary },
        ]}
        onSelect={(key) => {
          if (key === 'battle') {
            router.push('/(app)/wars?action=battle');
          } else {
            router.push({ pathname: '/(app)/finance', params: { action: key } });
          }
        }}
      />
    </View>
  );
}

function TaskRow({ adversary, onWin }: { adversary: AdversaryRow; onWin: () => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const won = adversary.status === 'won';

  return (
    <GlassCard
      onPress={onWin}
      accentColor={won ? colors.success : colors.glassBorder}
      style={styles.taskCard}
    >
      <View style={styles.taskRow}>
        <View
          style={[
            styles.check,
            {
              borderColor: won ? colors.success : colors.borderStrong,
              backgroundColor: won ? colors.success : 'transparent',
            },
          ]}
        >
          {won ? <Ionicons name="checkmark" size={16} color={colors.textInverse} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[
              styles.taskTitle,
              {
                color: won ? colors.textMuted : colors.text,
                textDecorationLine: won ? 'line-through' : 'none',
              },
            ]}
          >
            {adversary.title}
          </Text>
          <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
            {formatTime(adversary.scheduled_at)} · {adversary.duration_min} min · +{adversary.xp_reward} XP
          </Text>
        </View>
        <Ionicons
          name={won ? 'shield-checkmark' : 'ellipse-outline'}
          size={22}
          color={won ? colors.success : colors.textTertiary}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[5],
  },
  greeting: { fontSize: typography.sizes.base, fontWeight: '600' },
  date: { fontSize: typography.sizes.xl, fontWeight: '800', textTransform: 'capitalize', marginTop: 2 },
  headerChips: { flexDirection: 'row', gap: spacing[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '800' },
  heroCard: { overflow: 'hidden' },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    padding: spacing[5],
  },
  heroLegend: { flex: 1, gap: 6 },
  rank: { fontSize: typography.sizes['2xl'], fontWeight: '800', letterSpacing: -0.3 },
  heroMeta: { fontSize: typography.sizes.base, fontWeight: '600' },
  heroXp: { fontSize: typography.sizes.sm, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: spacing[3], marginVertical: spacing[4] },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: '800' },
  seeAll: { fontSize: typography.sizes.base, fontWeight: '700' },
  taskCard: { paddingVertical: spacing[3.5], paddingHorizontal: spacing[4], borderRadius: radius.lg },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: { fontSize: typography.sizes.md, fontWeight: '700' },
  taskMeta: { fontSize: typography.sizes.xs, marginTop: 2, fontWeight: '600' },
  warRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  warIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  warLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warName: { fontSize: typography.sizes.base, fontWeight: '700', flex: 1 },
  warCount: { fontSize: typography.sizes.sm, fontWeight: '700' },
});
