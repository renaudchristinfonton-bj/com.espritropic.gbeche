/**
 * GBECHE — Bilan.
 *
 * Trois questions, un seul écran : où j'en suis, qu'est-ce que ça dit,
 * et je fais quoi après ? Tous les chiffres viennent de SQLite, sont
 * calculés sur l'appareil par `src/domain/review.ts` et se comparent à la
 * période précédente de même durée. Aucun réseau, aucune donnée inventée.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from '@/src/services/haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { ProgressRing } from '@/src/components/ui/XPBar';
import { BarChart } from '@/src/components/charts/BarChart';
import { WeeklyTargetCard } from '@/src/components/review/WeeklyTargetCard';
import { WarBreakdown } from '@/src/components/review/WarBreakdown';
import { DonutChart } from '@/src/components/charts/DonutChart';
import { HeatMap } from '@/src/components/charts/HeatMap';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import { listInstancesInRange } from '@/src/db/repositories/adversaries.repo';
import { listTransactions } from '@/src/db/repositories/transactions.repo';
import { budgetsWithSpent } from '@/src/db/repositories/budgets.repo';
import { getWarriorProfile } from '@/src/services/gamification.service';
import { loadReviewTrend } from '@/src/services/review.service';
import { scoreSeries } from '@/src/domain/reviewSeries';
import { currentMonthKey, formatCompact, formatCurrency } from '@/src/services/format';
import { useAppStore } from '@/src/store/useAppStore';
import {
  REVIEW_PERIODS,
  buildReview,
  buildReviewText,
  previousWindow,
  reviewWindow,
  type Review,
  type ReviewAction,
  type ReviewDay,
  type ReviewInsight,
  type ReviewPeriod,
} from '@/src/domain/review';
import { MOTION, enterDelay, motionDuration } from '@/src/theme/motion';
import { radius, spacing, typography } from '@/src/theme';
import { SCREEN_BOTTOM_PADDING } from '@/src/theme/layout';
import type { ChartPoint } from '@/src/components/charts/BarChart';

const PERIOD_LABEL: Record<ReviewPeriod, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours' };

const TONE_COLOR = { good: 'success', warn: 'danger', info: 'primary' } as const;

export default function ReviewScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [period, setPeriod] = useState<ReviewPeriod>(7);
  const pushReminder = useAppStore((state) => state.pushReminder);

  const query = useRepoQuery<Review>(async () => {
    const now = Date.now();
    const window = reviewWindow(now, period);
    const before = previousWindow(window, period);
    const [transactions, adversaries, budgets, profile] = await Promise.all([
      listTransactions({ from: before.from, to: now, limit: 4000 }),
      listInstancesInRange(before.from, now),
      budgetsWithSpent(currentMonthKey()),
      getWarriorProfile(),
    ]);
    return buildReview({ period, now, transactions, adversaries, budgets, profile });
  }, [period]);

  const trend = useRepoQuery(() => loadReviewTrend(4), []);
  const review = query.data;

  const chart = useMemo(() => (review ? buildChart(review.days, review.period) : []), [review]);
  const scorePoints = useMemo(() => (trend.data ? scoreSeries(trend.data.series) : []), [trend.data]);

  const onExport = useCallback(async () => {
    if (!review) return;
    const message = buildReviewText(review);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as {
          navigator?: { clipboard?: { writeText: (text: string) => Promise<void> } };
        }).navigator;
        await nav?.clipboard?.writeText(message);
        pushReminder({
          id: `review-export-${Date.now()}`,
          title: 'Bilan copié',
          body: 'Le résumé est dans ton presse-papiers.',
          createdAt: Date.now(),
        });
      } else {
        await Share.share({ message });
      }
    } catch {
      pushReminder({
        id: `review-export-${Date.now()}`,
        title: 'Partage indisponible',
        body: 'Ton appareil n’a pas voulu ouvrir le partage. Réessaie plus tard.',
        createdAt: Date.now(),
      });
    }
  }, [review, pushReminder]);

  const enter = (index: number) =>
    reduceMotion
      ? undefined
      : FadeInDown.duration(motionDuration(MOTION.slow, reduceMotion)).delay(enterDelay(index, reduceMotion));

  if (query.status === 'error') {
    return (
      <Screen>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.warning} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Bilan indisponible</Text>
          <Text style={[styles.muted, { color: colors.textMuted, textAlign: 'center' }]}>
            Tes données n’ont pas pu être lues. Rien n’est perdu : réessaie dans un instant.
          </Text>
          <Pressable
            onPress={() => query.reload()}
            accessibilityRole="button"
            style={[styles.exportButton, { borderColor: colors.borderStrong, marginTop: spacing[2] }]}
          >
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={[styles.exportText, { color: colors.primary }]}>Réessayer</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (query.status === 'loading' || !review) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Calcul de ton bilan…</Text>
        </View>
      </Screen>
    );
  }

  const scoreColor =
    review.score.value >= 70 ? colors.success : review.score.value >= 45 ? colors.primary : colors.warning;

  return (
    <Screen
      scroll
      padded={false}
      contentContainerStyle={{
        padding: spacing[5],
        paddingBottom: SCREEN_BOTTOM_PADDING,
        maxWidth: wide ? 860 : undefined,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.primary }]}>RAPPORT DE GUERRE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Bilan</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{PERIOD_LABEL[period]} · sur cet appareil</Text>
        </View>
        <Pressable
          onPress={onExport}
          accessibilityRole="button"
          accessibilityLabel="Partager le résumé du bilan"
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: colors.glass,
              borderColor: colors.glassBorder,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <SegmentedControl
        segments={REVIEW_PERIODS.map((value) => ({ value: String(value), label: PERIOD_LABEL[value] }))}
        value={String(period)}
        onChange={(value) => {
          Haptics.selectionAsync();
          setPeriod(Number(value) as ReviewPeriod);
        }}
      />

      {/* Score */}
      <Animated.View entering={enter(0)} style={{ marginTop: spacing[4] }}>
        <GlassCard elevated noPadding blur="light" style={styles.heroCard}>
          <LinearGradient
            colors={[`${scoreColor}26`, 'rgba(99,102,241,0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroBody, wide && styles.heroBodyWide]}>
            <ProgressRing
              size={140}
              strokeWidth={11}
              progress={review.score.value / 100}
              color={scoreColor}
              label={`${review.score.value}`}
              sublabel="/100"
            />
            <View style={styles.heroText}>
              <View style={[styles.gradeBadge, { backgroundColor: `${scoreColor}1A`, borderColor: scoreColor }]}>
                <Ionicons name="shield" size={13} color={scoreColor} />
                <Text style={[styles.gradeText, { color: scoreColor }]}>{review.score.grade.toUpperCase()}</Text>
              </View>
              <Text style={[styles.headline, { color: colors.text }]}>{review.headline}</Text>
              <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>{review.score.label}</Text>
            </View>
          </View>

          <View style={[styles.scoreBars, wide && styles.scoreBarsWide]}>
            <ScoreBar label="Discipline" value={review.score.components.consistency} color={colors.success} />
            <ScoreBar label="Régularité" value={review.score.components.regularity} color={colors.primary} />
            <ScoreBar label="Épargne" value={review.score.components.savings} color={colors.warning} />
            <ScoreBar label="Élan" value={review.score.components.momentum} color={colors.xp} />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Objectif calibré + tendance */}
      {trend.data ? (
        <Animated.View entering={enter(1)} style={{ marginBottom: spacing[4] }}>
          <WeeklyTargetCard target={trend.data.target} points={scorePoints} animated={!reduceMotion} />
        </Animated.View>
      ) : null}

      {/* Indicateurs */}
      <Animated.View entering={enter(2)} style={[styles.kpiGrid, wide && styles.kpiGridWide]}>
        <KpiTile
          icon="arrow-down"
          label="Entrées"
          value={formatCurrency(review.kpi.income)}
          accent={colors.success}
          hint={deltaHint(review.delta.net)}
        />
        <KpiTile
          icon="arrow-up"
          label="Sorties"
          value={formatCurrency(review.kpi.expense)}
          accent={colors.danger}
          hint={deltaHint(review.delta.expense, true)}
        />
        <KpiTile
          icon="wallet"
          label="Net"
          value={formatCurrency(review.kpi.net)}
          accent={review.kpi.net >= 0 ? colors.primary : colors.danger}
          hint={
            review.kpi.savingsRate === null
              ? 'Aucune entrée'
              : `Épargne ${Math.round(review.kpi.savingsRate * 100)} %`
          }
        />
        <KpiTile
          icon="flash"
          label="Missions"
          value={`${review.kpi.wins}/${review.kpi.wins + review.kpi.losses}`}
          accent={colors.xp}
          hint={review.kpi.pending > 0 ? `${review.kpi.pending} en attente` : 'Tout est tranché'}
        />
      </Animated.View>

      {/* Flux des dépenses */}
      <Animated.View entering={enter(3)}>
        <SectionHeader title="Dépenses dans le temps" />
        <GlassCard style={{ gap: spacing[3] }}>
          {review.kpi.expense === 0 ? (
            <Muted text="Aucune dépense sur la période. Ton argent dort, fais-le travailler." />
          ) : (
            <>
              <BarChart
                data={chart}
                height={170}
                barColor={colors.danger}
                showValues={review.period === 7}
                formatValue={(value) => formatCompact(value)}
                animated={!reduceMotion}
              />
              <View style={styles.chartFooter}>
                <Text style={[styles.chartLegend, { color: colors.textMuted }]}>
                  Moyenne {formatCurrency(Math.round(review.kpi.avgDailyExpense))} / jour
                </Text>
                <Text style={[styles.chartLegend, { color: colors.textMuted }]}>
                  Max {formatCurrency(review.kpi.biggestExpense)}
                </Text>
              </View>
            </>
          )}
        </GlassCard>
      </Animated.View>

      {/* Répartition */}
      {review.categories.length > 0 ? (
        <Animated.View entering={enter(4)}>
          <SectionHeader title="Où part l’argent" />
          <GlassCard style={[styles.donutCard, wide && styles.row]}>
            <DonutChart
              data={review.categories.slice(0, 6).map((category) => ({
                label: category.label,
                value: category.amount,
                color: category.color,
                icon: category.icon,
              }))}
              size={168}
              strokeWidth={18}
              centerLabel={formatCompact(review.kpi.expense)}
              centerSub="FCFA"
              showLegend={false}
              animated={!reduceMotion}
            />
            <View style={styles.legend}>
              {review.categories.slice(0, 6).map((category) => (
                <View key={category.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: category.color }]} />
                  <Text numberOfLines={1} style={[styles.legendLabel, { color: colors.text }]}>
                    {category.label}
                  </Text>
                  <Text style={[styles.legendValue, { color: colors.textMuted }]}>
                    {Math.round(category.share * 100)} %
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </Animated.View>
      ) : null}

      {/* Régularité */}
      <Animated.View entering={enter(5)}>
        <SectionHeader title="Régularité" />
        <GlassCard style={{ gap: spacing[4] }}>
          <View style={styles.heatHeader}>
            <Text style={[styles.heatValue, { color: colors.text }]}>
              {review.kpi.activeDays}
              <Text style={[styles.heatUnit, { color: colors.textMuted }]}> / {review.period} jours actifs</Text>
            </Text>
            <View style={[styles.streakPill, { backgroundColor: colors.warningBg, borderColor: colors.glassBorder }]}>
              <Ionicons name="flame" size={13} color={colors.streakColor} />
              <Text style={[styles.streakText, { color: colors.streakColor }]}>série</Text>
            </View>
          </View>
          <HeatMap data={review.heat} days={review.period} cellSize={13} gap={3} showMonths={review.period > 30} />
          <Text style={[styles.heatHint, { color: colors.textMuted }]}>
            Un jour est actif dès qu’une mission est gagnée ou qu’un mouvement financier est enregistré.
          </Text>
        </GlassCard>
      </Animated.View>

      {/* Comparaison par guerre */}
      <Animated.View entering={enter(6)}>
        <SectionHeader title="Tes guerres" />
        <WarBreakdown lines={review.wars} />
      </Animated.View>

      {/* Constats */}
      <Animated.View entering={enter(7)}>
        <SectionHeader title="Ce que ça dit" />
        <View style={{ gap: spacing[2.5] }}>
          {review.insights.length === 0 ? (
            <GlassCard>
              <Muted text="Pas encore assez de matière pour un constat. Reviens après quelques missions." />
            </GlassCard>
          ) : (
            review.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onPress={undefined} />
            ))
          )}
        </View>
      </Animated.View>

      {/* Budgets */}
      {review.budgets.length > 0 ? (
        <Animated.View entering={enter(8)}>
          <SectionHeader title="Budgets du mois" />
          <GlassCard style={{ gap: spacing[4] }}>
            {review.budgets.slice(0, 5).map((budget) => (
              <View key={budget.category} style={{ gap: 6 }}>
                <View style={styles.budgetRow}>
                  <Text style={[styles.budgetLabel, { color: colors.text }]}>{budget.label}</Text>
                  <Text style={[styles.budgetValue, { color: budget.over ? colors.danger : colors.textMuted }]}>
                    {formatCompact(budget.spent)} / {formatCompact(budget.amount)}
                  </Text>
                </View>
                <ProgressBar
                  progress={Math.min(1, budget.ratio)}
                  color={budget.over ? colors.danger : budget.ratio > 0.8 ? colors.warning : colors.success}
                  height={6}
                />
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      ) : null}

      {/* Prochaines actions */}
      <Animated.View entering={enter(9)}>
        <SectionHeader title="Et maintenant" />
        <View style={{ gap: spacing[2.5] }}>
          {review.actions.map((action, index) => (
            <ActionRow
              key={action.id}
              action={action}
              index={index}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(action.route as never);
              }}
            />
          ))}
        </View>
      </Animated.View>

      <Pressable
        onPress={onExport}
        accessibilityRole="button"
        accessibilityLabel="Copier ou partager le résumé du bilan"
        style={({ pressed }) => [
          styles.exportButton,
          { borderColor: colors.borderStrong, backgroundColor: colors.glass, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="download-outline" size={17} color={colors.primary} />
        <Text style={[styles.exportText, { color: colors.primary }]}>
          {Platform.OS === 'web' ? 'Copier le résumé' : 'Partager le résumé'}
        </Text>
      </Pressable>

      <Text style={[styles.footnote, { color: colors.textTertiary }]}>
        Calculé sur ton appareil, à partir de tes propres données. Rien n’est envoyé nulle part.
      </Text>
    </Screen>
  );
}

// ─── Sous-composants ─────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme().theme;
  return (
    <View style={styles.scoreBar}>
      <View style={styles.scoreBarHeader}>
        <Text style={[styles.scoreBarLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color }]}>{value}</Text>
      </View>
      <ProgressBar progress={value / 100} color={color} height={5} />
    </View>
  );
}

function KpiTile({
  icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  const { colors } = useTheme().theme;
  return (
    <View
      style={[styles.kpiTile, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      accessible
      accessibilityLabel={`${label} : ${value}${hint ? `, ${hint}` : ''}`}
    >
      <View style={[styles.kpiIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.kpiValue, { color: colors.text }]}>
        {value}
      </Text>
      <Text numberOfLines={1} style={[styles.kpiLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      {hint ? (
        <Text numberOfLines={1} style={[styles.kpiHint, { color: accent }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function InsightCard({ insight, onPress }: { insight: ReviewInsight; onPress?: () => void }) {
  const { colors } = useTheme().theme;
  const key = TONE_COLOR[insight.tone];
  const tone = colors[key];
  return (
    <GlassCard onPress={onPress} animated={Boolean(onPress)} style={styles.insightCard}>
      <View style={[styles.insightBar, { backgroundColor: tone }]} />
      <View style={styles.insightBody}>
        <View style={styles.insightTitleRow}>
          <Ionicons name={insight.icon as keyof typeof Ionicons.glyphMap} size={16} color={tone} />
          <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
        </View>
        <Text style={[styles.insightText, { color: colors.textMuted }]}>{insight.body}</Text>
      </View>
    </GlassCard>
  );
}

function ActionRow({ action, index, onPress }: { action: ReviewAction; index: number; onPress: () => void }) {
  const { colors } = useTheme().theme;
  const accent = colors[action.accent];
  return (
    <GlassCard onPress={onPress} style={styles.actionCard}>
      <View style={styles.actionRow}>
        <View style={[styles.actionIndex, { borderColor: accent }]}>
          <Text style={[styles.actionIndexText, { color: accent }]}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.actionTitle, { color: colors.text }]}>
            {action.title}
          </Text>
          <Text numberOfLines={2} style={[styles.actionSubtitle, { color: colors.textMuted }]}>
            {action.subtitle}
          </Text>
        </View>
        <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color={accent} />
      </View>
    </GlassCard>
  );
}

function Muted({ text }: { text: string }) {
  const { colors } = useTheme().theme;
  return <Text style={[styles.muted, { color: colors.textMuted }]}>{text}</Text>;
}

// ─── Séries du graphe ────────────────────────────────────

function weekdayShort(ms: number): string {
  const label = new Date(ms).toLocaleDateString('fr-FR', { weekday: 'short' });
  return label.replace('.', '').slice(0, 3);
}

/**
 * 7 jours → une barre par jour ; 30 jours → une barre par jour avec
 * quelques libellés ; 90 jours → une barre par semaine (13 lisibles).
 */
export function buildChart(days: ReviewDay[], period: ReviewPeriod): ChartPoint[] {
  if (period === 90) {
    const buckets: ChartPoint[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const slice = days.slice(i, i + 7);
      buckets.push({
        label: `${new Date(slice[0].dayStart).getDate()}`,
        value: slice.reduce((sum, day) => sum + day.expense, 0),
      });
    }
    return buckets;
  }
  return days.map((day, index) => ({
    label:
      period === 7
        ? weekdayShort(day.dayStart)
        : index % 5 === 0
          ? `${new Date(day.dayStart).getDate()}`
          : '',
    value: day.expense,
  }));
}

function deltaHint(delta: number | null, invert = false): string {
  if (delta === null) return 'Nouveau';
  if (Math.abs(delta) < 0.005) return 'Stable';
  const sign = delta > 0 ? '+' : '−';
  const good = invert ? delta < 0 : delta > 0;
  return `${good ? '▲' : '▼'} ${sign}${Math.round(Math.abs(delta) * 100)} %`;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  loadingText: { fontSize: typography.sizes.base, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[3] },
  kicker: { fontSize: typography.sizes.xs, fontWeight: '900', letterSpacing: 1.6 },
  title: { fontSize: typography.sizes['4xl'], fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: typography.sizes.sm, fontWeight: '600', marginTop: 2 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: { overflow: 'hidden', marginBottom: spacing[4] },
  heroBody: { padding: spacing[5], gap: spacing[5], alignItems: 'center' },
  heroBodyWide: { flexDirection: 'row', alignItems: 'center' },
  heroText: { flex: 1, gap: 8 },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  gradeText: { fontSize: typography.sizes.xs, fontWeight: '900', letterSpacing: 1 },
  headline: { fontSize: typography.sizes.lg, fontWeight: '800', lineHeight: 25 },
  scoreLabel: { fontSize: typography.sizes.sm, fontWeight: '600' },
  scoreBars: { paddingHorizontal: spacing[5], paddingBottom: spacing[5], gap: spacing[3] },
  scoreBarsWide: { flexDirection: 'row', flexWrap: 'wrap' },
  scoreBar: { flex: 1, minWidth: 140, gap: 5 },
  scoreBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreBarLabel: { fontSize: typography.sizes.xs, fontWeight: '700' },
  scoreBarValue: { fontSize: typography.sizes.xs, fontWeight: '900' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[2] },
  kpiGridWide: { flexWrap: 'nowrap' },
  kpiTile: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: 4,
  },
  kpiIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: typography.sizes.lg, fontWeight: '900', marginTop: 4 },
  kpiLabel: { fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  kpiHint: { fontSize: typography.sizes.xs, fontWeight: '800' },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLegend: { fontSize: typography.sizes.xs, fontWeight: '700' },
  donutCard: { alignItems: 'center', gap: spacing[4] },
  row: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, gap: spacing[2] },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: typography.sizes.sm, fontWeight: '700' },
  legendValue: { fontSize: typography.sizes.sm, fontWeight: '900' },
  heatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heatValue: { fontSize: typography.sizes.xl, fontWeight: '900' },
  heatUnit: { fontSize: typography.sizes.sm, fontWeight: '600' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  streakText: { fontSize: typography.sizes.xs, fontWeight: '800' },
  heatHint: { fontSize: typography.sizes.xs, fontWeight: '600', lineHeight: 16 },
  insightCard: { flexDirection: 'row', gap: spacing[3], paddingVertical: spacing[3.5] },
  insightBar: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  insightBody: { flex: 1, gap: 4 },
  insightTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightTitle: { flex: 1, fontSize: typography.sizes.base, fontWeight: '800' },
  insightText: { fontSize: typography.sizes.sm, fontWeight: '500', lineHeight: 19 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabel: { fontSize: typography.sizes.sm, fontWeight: '700' },
  budgetValue: { fontSize: typography.sizes.sm, fontWeight: '800' },
  actionCard: { paddingVertical: spacing[3.5] },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  actionIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIndexText: { fontSize: typography.sizes.xs, fontWeight: '900' },
  actionTitle: { fontSize: typography.sizes.base, fontWeight: '800' },
  actionSubtitle: { fontSize: typography.sizes.xs, fontWeight: '600', marginTop: 2 },
  exportButton: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
  },
  exportText: { fontSize: typography.sizes.sm, fontWeight: '800' },
  footnote: { marginTop: spacing[3], fontSize: typography.sizes.xs, textAlign: 'center', lineHeight: 16 },
  muted: { fontSize: typography.sizes.sm, fontWeight: '600', lineHeight: 20 },
});
