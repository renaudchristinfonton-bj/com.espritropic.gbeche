/**
 * GBECHE — Écran Guerres.
 * Guerres (domaines) → Batailles (objectifs) → Templates + Adversaires (tâches).
 * Toutes les écritures passent par les services et persistent dans SQLite.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { Sheet } from '@/src/components/ui/Sheet';
import { TextField } from '@/src/components/ui/TextField';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import { listWars } from '@/src/db/repositories/wars.repo';
import {
  getBattleProgress,
  listBattlesByWar,
  type BattleProgress,
} from '@/src/db/repositories/battles.repo';
import type { AdversaryRow, BattleRow, Frequency, Priority, WarRow } from '@/src/db/types';
import {
  addBattle,
  addQuickAdversary,
  addTemplate,
  getBattleDetail,
} from '@/src/services/wars.service';
import { winAdversary } from '@/src/services/gamification.service';
import { useAppStore } from '@/src/store/useAppStore';
import {
  FREQUENCY_LABELS,
  PRIORITY_META,
  WEEKDAY_LABELS,
} from '@/src/domain/catalog';
import { formatDate, formatTime } from '@/src/services/format';
import { radius, spacing, typography } from '@/src/theme';

const HOUR_CHOICES = [6, 8, 12, 18, 21];

export default function WarsScreen() {
  const { colors } = useTheme().theme;
  const params = useLocalSearchParams<{ action?: string }>();

  const warsQuery = useRepoQuery(() => listWars(true), []);
  const wars = warsQuery.data ?? [];
  const [selectedWarId, setSelectedWarId] = useState<string | null>(null);

  const [battleSheetOpen, setBattleSheetOpen] = useState(false);
  const [detailBattle, setDetailBattle] = useState<BattleRow | null>(null);
  const [templateBattle, setTemplateBattle] = useState<BattleRow | null>(null);
  const [quickBattle, setQuickBattle] = useState<BattleRow | null>(null);

  useEffect(() => {
    if (wars.length && !selectedWarId) setSelectedWarId(wars[0].id);
  }, [wars, selectedWarId]);

  useEffect(() => {
    if (params.action === 'battle' && selectedWarId) {
      setBattleSheetOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.action, selectedWarId]);

  const selectedWar = wars.find((w) => w.id === selectedWarId) ?? null;

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing[5], paddingBottom: spacing[3] }}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Mes Guerres</Text>
        <Text style={[styles.screenSub, { color: colors.textMuted }]}>
          Tes domaines de vie, tes objectifs et tes missions quotidiennes.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.warScroller}
      >
        {wars.map((war) => {
          const active = war.id === selectedWarId;
          return (
            <Pressable
              key={war.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedWarId(war.id);
              }}
              style={[
                styles.warTab,
                {
                  backgroundColor: active ? `${war.color}18` : colors.glass,
                  borderColor: active ? war.color : colors.glassBorder,
                },
              ]}
            >
              <Ionicons name={war.icon as never} size={20} color={war.color} />
              <Text
                numberOfLines={1}
                style={[styles.warTabLabel, { color: active ? colors.text : colors.textMuted }]}
              >
                {war.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: 120, gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
      >
        {selectedWar ? <WarSection war={selectedWar} onOpenBattle={setDetailBattle} /> : null}

        <Button
          label="Nouvelle bataille"
          icon={<Ionicons name="add-circle" size={18} color={colors.textInverse} />}
          onPress={() => setBattleSheetOpen(true)}
          fullWidth
        />
      </ScrollView>

      {/* Feuilles */}
      {selectedWar ? (
        <CreateBattleSheet
          visible={battleSheetOpen}
          war={selectedWar}
          onClose={() => setBattleSheetOpen(false)}
        />
      ) : null}

      <BattleDetailSheet
        battle={detailBattle}
        onClose={() => setDetailBattle(null)}
        onAddTemplate={(battle) => {
          setDetailBattle(null);
          setTemplateBattle(battle);
        }}
        onAddQuick={(battle) => {
          setDetailBattle(null);
          setQuickBattle(battle);
        }}
      />

      <CreateTemplateSheet battle={templateBattle} onClose={() => setTemplateBattle(null)} />
      <QuickAdversarySheet battle={quickBattle} onClose={() => setQuickBattle(null)} />
    </Screen>
  );
}

// ─── Section d'une guerre ─────────────────────────────────
function WarSection({
  war,
  onOpenBattle,
}: {
  war: WarRow;
  onOpenBattle: (battle: BattleRow) => void;
}) {
  const { colors } = useTheme().theme;
  const battlesQuery = useRepoQuery(() => listBattlesByWar(war.id), [war.id]);
  const battles = battlesQuery.data ?? [];

  if (battles.length === 0) {
    return (
      <EmptyState
        icon="flag-outline"
        title="Aucune bataille pour l'instant"
        description={`Définis ton premier objectif dans la guerre « ${war.title} ».`}
        color={war.color}
      />
    );
  }

  return (
    <>
      <GlassCard animated={false} style={styles.warSummary}>
        <View style={[styles.warSummaryIcon, { backgroundColor: `${war.color}1A` }]}>
          <Ionicons name={war.icon as never} size={24} color={war.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.warSummaryTitle, { color: colors.text }]}>{war.title}</Text>
          <Text style={[styles.warSummaryXp, { color: colors.xp }]}>{war.xp_earned} XP gagnés</Text>
        </View>
      </GlassCard>

      {battles.map((battle) => (
        <BattleCard key={battle.id} battle={battle} onPress={() => onOpenBattle(battle)} />
      ))}
    </>
  );
}

function BattleCard({ battle, onPress }: { battle: BattleRow; onPress: () => void }) {
  const { colors } = useTheme().theme;
  const progressQuery = useRepoQuery(() => getBattleProgress(battle.id), [battle.id]);
  const progress: BattleProgress = progressQuery.data ?? { total: 0, won: 0, pending: 0, lost: 0 };
  const ratio = progress.total ? progress.won / progress.total : 0;
  const priority = PRIORITY_META[battle.priority];
  const done = battle.status === 'won';

  return (
    <GlassCard onPress={onPress} accentColor={done ? colors.success : colors.glassBorder}>
      <View style={styles.battleHead}>
        <Text
          numberOfLines={1}
          style={[
            styles.battleTitle,
            { color: done ? colors.textMuted : colors.text, textDecorationLine: done ? 'line-through' : 'none' },
          ]}
        >
          {battle.title}
        </Text>
        <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
      </View>
      <View style={styles.battleMetaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.battleMeta, { color: colors.textMuted }]}>
          {battle.deadline ? formatDate(battle.deadline) : 'Sans échéance'}
        </Text>
        <Text style={[styles.battleCount, { color: colors.textMuted }]}>
          {progress.won}/{progress.total} adversaires
        </Text>
      </View>
      <ProgressBar progress={ratio} color={done ? colors.success : colors.primary} height={7} />
    </GlassCard>
  );
}

// ─── Sheet : création de bataille ─────────────────────────
function CreateBattleSheet({
  visible,
  war,
  onClose,
}: {
  visible: boolean;
  war: WarRow;
  onClose: () => void;
}) {
  const { colors } = useTheme().theme;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadlineDays, setDeadlineDays] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDeadlineDays(30);
    setSaving(false);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addBattle({
        warId: war.id,
        title,
        description,
        priority,
        deadline: deadlineDays ? new Date(Date.now() + deadlineDays * 86400000) : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title="Nouvelle bataille" onClose={onClose}>
      <TextField
        label="Titre de l'objectif"
        icon="flag"
        placeholder="Ex : Fonds d'urgence 300 000 FCFA"
        value={title}
        onChangeText={setTitle}
      />
      <TextField
        label="Description (optionnel)"
        icon="document-text"
        placeholder="Pourquoi cette bataille ?"
        value={description}
        onChangeText={setDescription}
      />

      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Échéance</Text>
      <View style={styles.chipRow}>
        {[
          { label: '7 jours', value: 7 },
          { label: '30 jours', value: 30 },
          { label: '90 jours', value: 90 },
          { label: 'Aucune', value: 0 },
        ].map((choice) => (
          <Chip
            key={choice.label}
            label={choice.label}
            selected={deadlineDays === choice.value}
            onPress={() => setDeadlineDays(choice.value)}
          />
        ))}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Priorité</Text>
      <SegmentedControl<Priority>
        segments={[
          { value: 'low', label: 'Basse' },
          { value: 'medium', label: 'Moyenne' },
          { value: 'high', label: 'Haute' },
        ]}
        value={priority}
        onChange={setPriority}
      />

      <Button
        label="Créer la bataille"
        onPress={save}
        loading={saving}
        disabled={!title.trim()}
        fullWidth
        style={{ marginTop: spacing[5] }}
      />
    </Sheet>
  );
}

// ─── Sheet : détail d'une bataille ────────────────────────
function BattleDetailSheet({
  battle,
  onClose,
  onAddTemplate,
  onAddQuick,
}: {
  battle: BattleRow | null;
  onClose: () => void;
  onAddTemplate: (battle: BattleRow) => void;
  onAddQuick: (battle: BattleRow) => void;
}) {
  const { colors } = useTheme().theme;
  const showXpFeedback = useAppStore((s) => s.showXpFeedback);
  const detailQuery = useRepoQuery(
    () => (battle ? getBattleDetail(battle.id) : Promise.resolve(null)),
    [battle?.id],
  );
  const detail = detailQuery.data;

  const handleWin = async (adversary: AdversaryRow) => {
    if (adversary.status === 'won') return;
    const result = await winAdversary(adversary.id);
    showXpFeedback({
      xpGained: result.xpGained,
      multiplier: result.multiplier,
      combo: result.combo,
      leveledUp: result.leveledUp,
    });
  };

  const upcoming = useMemo(
    () =>
      (detail?.instances ?? [])
        .filter((instance) => instance.status !== 'won')
        .sort((a, b) => a.scheduled_at - b.scheduled_at)
        .slice(0, 8),
    [detail],
  );

  return (
    <Sheet visible={!!battle} title={battle?.title ?? ''} onClose={onClose}>
      {detail ? (
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {detail.templates.length} routine(s) · {detail.progress.won}/{detail.progress.total} victoires
          </Text>

          {detail.templates.length === 0 && upcoming.length === 0 ? (
            <Text style={[styles.emptyDetail, { color: colors.textMuted }]}>
              Aucun adversaire programmé. Ajoute une routine récurrente ou une mission ponctuelle.
            </Text>
          ) : null}

          {upcoming.map((adversary) => (
            <Pressable
              key={adversary.id}
              onPress={() => handleWin(adversary)}
              style={[
                styles.instanceRow,
                { backgroundColor: colors.glass, borderColor: colors.glassBorder },
              ]}
            >
              <View style={[styles.instanceCheck, { borderColor: colors.success }]}>
                <Ionicons name="checkmark" size={15} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.instanceTitle, { color: colors.text }]}>
                  {adversary.title}
                </Text>
                <Text style={[styles.instanceMeta, { color: colors.textMuted }]}>
                  {formatDate(adversary.scheduled_at)} · {formatTime(adversary.scheduled_at)}
                </Text>
              </View>
              <Text style={[styles.instanceXp, { color: colors.xp }]}>
                +{adversary.xp_reward}
              </Text>
            </Pressable>
          ))}

          <View style={styles.detailActions}>
            <Button
              label="Routine récurrente"
              variant="glass"
              size="sm"
              icon={<Ionicons name="repeat" size={16} color={colors.primary} />}
              onPress={() => battle && onAddTemplate(battle)}
              style={{ flex: 1 }}
            />
            <Button
              label="Mission ponctuelle"
              variant="glass"
              size="sm"
              icon={<Ionicons name="flash" size={16} color={colors.accent} />}
              onPress={() => battle && onAddQuick(battle)}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

// ─── Sheet : routine récurrente ───────────────────────────
function CreateTemplateSheet({
  battle,
  onClose,
}: {
  battle: BattleRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme().theme;
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [days, setDays] = useState<number[]>([1]);
  const [hour, setHour] = useState(8);
  const [xp, setXp] = useState('50');
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  };

  const save = async () => {
    if (!battle || !title.trim()) return;
    setSaving(true);
    try {
      await addTemplate({
        battleId: battle.id,
        title,
        frequency,
        specificDays: frequency === 'specific_days' ? days : undefined,
        hour,
        xpReward: Number(xp) || 50,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle('');
      setSaving(false);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={!!battle} title="Routine récurrente" onClose={onClose}>
      <TextField
        label="Nom de l'adversaire"
        icon="flash"
        placeholder="Ex : Séance de sport 30 min"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Fréquence</Text>
      <View style={styles.chipRow}>
        {(Object.keys(FREQUENCY_LABELS) as Frequency[])
          .filter((f) => f !== 'yearly')
          .map((value) => (
            <Chip
              key={value}
              label={FREQUENCY_LABELS[value]}
              selected={frequency === value}
              onPress={() => setFrequency(value)}
            />
          ))}
      </View>

      {frequency === 'specific_days' ? (
        <>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Jours</Text>
          <View style={styles.chipRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Chip
                key={label}
                label={label}
                selected={days.includes(index + 1)}
                onPress={() => toggleDay(index + 1)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Heure</Text>
      <View style={styles.chipRow}>
        {HOUR_CHOICES.map((value) => (
          <Chip
            key={value}
            label={`${value}h`}
            selected={hour === value}
            onPress={() => setHour(value)}
          />
        ))}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Récompense XP</Text>
      <TextInput
        value={xp}
        onChangeText={(text) => setXp(text.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
        style={[styles.numericInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
      />

      <Button
        label="Programmer la routine"
        onPress={save}
        loading={saving}
        disabled={!title.trim() || (frequency === 'specific_days' && days.length === 0)}
        fullWidth
        style={{ marginTop: spacing[5] }}
      />
    </Sheet>
  );
}

// ─── Sheet : mission ponctuelle ───────────────────────────
function QuickAdversarySheet({
  battle,
  onClose,
}: {
  battle: BattleRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme().theme;
  const [title, setTitle] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState(18);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!battle || !title.trim()) return;
    setSaving(true);
    try {
      const when = new Date();
      when.setDate(when.getDate() + dayOffset);
      when.setHours(hour, 0, 0, 0);
      await addQuickAdversary({ battleId: battle.id, title, scheduledAt: when });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle('');
      setSaving(false);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={!!battle} title="Mission ponctuelle" onClose={onClose}>
      <TextField
        label="Mission"
        icon="flash"
        placeholder="Ex : Appeler le client X"
        value={title}
        onChangeText={setTitle}
      />
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Quand ?</Text>
      <View style={styles.chipRow}>
        {[
          { label: "Aujourd'hui", value: 0 },
          { label: 'Demain', value: 1 },
          { label: 'Dans 3 j', value: 3 },
          { label: 'Dans 7 j', value: 7 },
        ].map((choice) => (
          <Chip
            key={choice.label}
            label={choice.label}
            selected={dayOffset === choice.value}
            onPress={() => setDayOffset(choice.value)}
          />
        ))}
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Heure</Text>
      <View style={styles.chipRow}>
        {HOUR_CHOICES.map((value) => (
          <Chip key={value} label={`${value}h`} selected={hour === value} onPress={() => setHour(value)} />
        ))}
      </View>
      <Button
        label="Ajouter la mission"
        onPress={save}
        loading={saving}
        disabled={!title.trim()}
        fullWidth
        style={{ marginTop: spacing[5] }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: typography.sizes['3xl'], fontWeight: '800', letterSpacing: -0.5 },
  screenSub: { fontSize: typography.sizes.md, marginTop: 4, lineHeight: 22 },
  warScroller: { paddingHorizontal: spacing[5], gap: spacing[2.5], paddingBottom: spacing[2] },
  warTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  warTabLabel: { fontSize: typography.sizes.base, fontWeight: '700', maxWidth: 130 },
  warSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    borderRadius: radius.lg,
  },
  warSummaryIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  warSummaryTitle: { fontSize: typography.sizes.lg, fontWeight: '800' },
  warSummaryXp: { fontSize: typography.sizes.sm, fontWeight: '700', marginTop: 2 },
  battleHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  battleTitle: { flex: 1, fontSize: typography.sizes.md, fontWeight: '800' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  battleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 8 },
  battleMeta: { fontSize: typography.sizes.sm, fontWeight: '600', flex: 1 },
  battleCount: { fontSize: typography.sizes.sm, fontWeight: '700' },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing[2] },
  numericInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    minHeight: 52,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  emptyDetail: { fontSize: typography.sizes.base, lineHeight: 22, marginVertical: spacing[3] },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  instanceCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instanceTitle: { fontSize: typography.sizes.base, fontWeight: '700' },
  instanceMeta: { fontSize: typography.sizes.xs, marginTop: 2, fontWeight: '600' },
  instanceXp: { fontSize: typography.sizes.sm, fontWeight: '800' },
  detailActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
});
