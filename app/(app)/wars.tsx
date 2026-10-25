/**
 * GBECHE — Écran Guerres.
 * Guerres (domaines) → Batailles (objectifs) → Templates + Adversaires (tâches).
 * Toutes les écritures passent par les services et persistent dans SQLite.
 * Chaque niveau supporte la création, la modification et la suppression.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from '@/src/services/haptics';

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
import { createWar, listWars, setWarActive } from '@/src/db/repositories/wars.repo';
import {
  getBattleProgress,
  listBattlesByWar,
  type BattleProgress,
} from '@/src/db/repositories/battles.repo';
import type {
  AdversaryRow,
  AdversaryTemplateRow,
  BattleRow,
  Frequency,
  Priority,
  WarRow,
} from '@/src/db/types';
import {
  addBattle,
  addQuickAdversary,
  addTemplate,
  editBattle,
  editManualInstance,
  editTemplate,
  editWar,
  getBattleDetail,
  removeBattle,
  removeInstance,
  removeTemplate,
  removeWar,
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

// Choix proposés à l'utilisateur pour créer sa propre guerre.
const WAR_ICON_CHOICES = [
  'flame',
  'trophy',
  'shield-checkmark',
  'star',
  'heart',
  'rocket',
  'moon',
  'hammer',
  'musical-notes',
  'globe',
  'camera',
  'code-slash',
] as const;

const WAR_COLOR_CHOICES = [
  '#FFD700',
  '#FF9F43',
  '#00FF88',
  '#00E5FF',
  '#A78BFA',
  '#FF6B35',
  '#6366F1',
  '#FF4757',
] as const;

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}

export default function WarsScreen() {
  const { colors } = useTheme().theme;
  const params = useLocalSearchParams<{ action?: string }>();

  const warsQuery = useRepoQuery(() => listWars(true), []);
  const wars = warsQuery.data ?? [];
  const [selectedWarId, setSelectedWarId] = useState<string | null>(null);

  const [battleSheetOpen, setBattleSheetOpen] = useState(false);
  const [warSheetOpen, setWarSheetOpen] = useState(false);
  const [detailBattle, setDetailBattle] = useState<BattleRow | null>(null);
  const [templateBattle, setTemplateBattle] = useState<BattleRow | null>(null);
  const [quickBattle, setQuickBattle] = useState<BattleRow | null>(null);

  // Cibles d'édition (null = mode création).
  const [editingWar, setEditingWar] = useState<WarRow | null>(null);
  const [editingBattle, setEditingBattle] = useState<BattleRow | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AdversaryTemplateRow | null>(null);
  const [editingInstance, setEditingInstance] = useState<AdversaryRow | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const list = warsQuery.data ?? [];
    if (list.length === 0) {
      setSelectedWarId(null);
    } else if (!selectedWarId || !list.some((war) => war.id === selectedWarId)) {
      setSelectedWarId(list[0].id);
    }
  }, [warsQuery.data, selectedWarId]);

  useEffect(() => {
    if (params.action === 'battle' && selectedWarId) {
      setBattleSheetOpen(true);
    }
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
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditingWar(null);
            setWarSheetOpen(true);
          }}
          style={[styles.warTab, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={[styles.warTabLabel, { color: colors.primary }]}>Nouvelle guerre</Text>
        </Pressable>
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: 120, gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
      >
        {selectedWar ? (
          <WarSection
            war={selectedWar}
            onOpenBattle={setDetailBattle}
            onEditWar={(war) => {
              setEditingWar(war);
              setWarSheetOpen(true);
            }}
          />
        ) : null}

        <Button
          label="Nouvelle bataille"
          icon={<Ionicons name="add-circle" size={18} color={colors.textInverse} />}
          onPress={() => {
            setEditingBattle(null);
            setBattleSheetOpen(true);
          }}
          fullWidth
        />
      </ScrollView>

      {/* Feuilles */}
      <WarSheet
        visible={warSheetOpen}
        war={editingWar}
        onClose={() => setWarSheetOpen(false)}
        onCreated={(id) => setSelectedWarId(id)}
        onRequestDelete={(war) =>
          setConfirm({
            title: 'Supprimer la guerre ?',
            message: `« ${war.title} » et toutes ses batailles et missions seront supprimés définitivement.`,
            confirmLabel: 'Supprimer',
            onConfirm: async () => {
              await removeWar(war.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setWarSheetOpen(false);
            },
          })
        }
      />

      {selectedWar ? (
        <BattleSheet
          visible={battleSheetOpen}
          war={selectedWar}
          battle={editingBattle}
          onClose={() => setBattleSheetOpen(false)}
          onRequestDelete={(battle) =>
            setConfirm({
              title: 'Supprimer la bataille ?',
              message: `« ${battle.title} » et ses adversaires seront supprimés définitivement.`,
              confirmLabel: 'Supprimer',
              onConfirm: async () => {
                await removeBattle(battle.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setBattleSheetOpen(false);
                setDetailBattle(null);
              },
            })
          }
        />
      ) : null}

      <BattleDetailSheet
        battle={detailBattle}
        onClose={() => setDetailBattle(null)}
        onAddTemplate={(battle) => {
          setDetailBattle(null);
          setEditingTemplate(null);
          setTemplateBattle(battle);
        }}
        onAddQuick={(battle) => {
          setDetailBattle(null);
          setEditingInstance(null);
          setQuickBattle(battle);
        }}
        onEditTemplate={(battle, template) => {
          setDetailBattle(null);
          setEditingTemplate(template);
          setTemplateBattle(battle);
        }}
        onEditInstance={(battle, instance) => {
          setDetailBattle(null);
          setEditingInstance(instance);
          setQuickBattle(battle);
        }}
        onDeleteTemplate={(template) =>
          setConfirm({
            title: 'Arrêter la routine ?',
            message: `« ${template.title} » ne générera plus de missions. L'historique des victoires est conservé.`,
            confirmLabel: 'Arrêter',
            onConfirm: async () => {
              await removeTemplate(template.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          })
        }
        onDeleteInstance={(instance) =>
          setConfirm({
            title: 'Supprimer la mission ?',
            message: `« ${instance.title} » sera supprimée définitivement.`,
            confirmLabel: 'Supprimer',
            onConfirm: async () => {
              await removeInstance(instance.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          })
        }
      />

      <TemplateSheet
        battle={templateBattle}
        template={editingTemplate}
        onClose={() => setTemplateBattle(null)}
      />
      <QuickAdversarySheet
        battle={quickBattle}
        instance={editingInstance}
        onClose={() => setQuickBattle(null)}
        onRequestDelete={(instance) =>
          setConfirm({
            title: 'Supprimer la mission ?',
            message: `« ${instance.title} » sera supprimée définitivement.`,
            confirmLabel: 'Supprimer',
            onConfirm: async () => {
              await removeInstance(instance.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setQuickBattle(null);
            },
          })
        }
      />

      <ConfirmSheet
        state={confirm}
        onClose={() => setConfirm(null)}
        onConfirmed={async () => {
          const action = confirm?.onConfirm;
          setConfirm(null);
          try {
            await action?.();
          } catch (error) {
            console.error('[confirm]', error);
          }
        }}
      />
    </Screen>
  );
}

// ─── Confirmation générique (cross-plateforme, web inclus) ─
function ConfirmSheet({
  state,
  onClose,
  onConfirmed,
}: {
  state: ConfirmState | null;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  return (
    <Sheet visible={!!state} title={state?.title ?? ''} onClose={onClose}>
      <Text style={styles.confirmText}>{state?.message}</Text>
      <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] }}>
        <Button label="Annuler" variant="glass" onPress={onClose} style={{ flex: 1 }} />
        <Button
          label={state?.confirmLabel ?? 'Confirmer'}
          variant="danger"
          onPress={onConfirmed}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}

// ─── Section d'une guerre ─────────────────────────────────
function WarSection({
  war,
  onOpenBattle,
  onEditWar,
}: {
  war: WarRow;
  onOpenBattle: (battle: BattleRow) => void;
  onEditWar: (war: WarRow) => void;
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifier la guerre"
          onPress={() => onEditWar(war)}
          hitSlop={10}
          style={[styles.iconButton, { borderColor: colors.glassBorder }]}
        >
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </GlassCard>

      {battles.map((battle) => (
        <BattleCard key={battle.id} battle={battle} onPress={() => onOpenBattle(battle)} onEdit={() => onOpenBattle(battle)} />
      ))}
    </>
  );
}

function BattleCard({
  battle,
  onPress,
  onEdit,
}: {
  battle: BattleRow;
  onPress: () => void;
  onEdit: () => void;
}) {
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifier la bataille"
          onPress={onEdit}
          hitSlop={10}
        >
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
        </Pressable>
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

// ─── Sheet : création / modification d'une guerre ─────────
function WarSheet({
  visible,
  war,
  onClose,
  onCreated,
  onRequestDelete,
}: {
  visible: boolean;
  war: WarRow | null;
  onClose: () => void;
  onCreated: (warId: string) => void;
  onRequestDelete: (war: WarRow) => void;
}) {
  const { colors } = useTheme().theme;
  const allWarsQuery = useRepoQuery(() => listWars(false), []);
  const allWars = allWarsQuery.data ?? [];
  const inactiveWars = allWars.filter((item) => !item.is_active);
  const isEdit = !!war;

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string>(WAR_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(WAR_COLOR_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(war?.title ?? '');
      setIcon(war?.icon ?? WAR_ICON_CHOICES[0]);
      setColor(war?.color ?? WAR_COLOR_CHOICES[0]);
      setSaving(false);
    }
  }, [visible, war]);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (isEdit && war) {
        await editWar(war.id, { title, icon, color });
      } else {
        const id = await createWar({ title, icon, color, domainType: 'custom' });
        onCreated(id);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  const toggleActive = async (item: WarRow) => {
    await setWarActive(item.id, !item.is_active);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Sheet visible={visible} title={isEdit ? 'Modifier la guerre' : 'Nouvelle guerre'} onClose={onClose}>
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <TextField
          label="Nom de la guerre"
          icon="shield"
          placeholder="Ex : Projet immobilier"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Icône</Text>
        <View style={styles.iconGrid}>
          {WAR_ICON_CHOICES.map((name) => {
            const selectedIcon = name === icon;
            return (
              <Pressable
                key={name}
                onPress={() => setIcon(name)}
                style={[
                  styles.iconCell,
                  {
                    backgroundColor: selectedIcon ? `${color}1F` : colors.glass,
                    borderColor: selectedIcon ? color : colors.glassBorder,
                  },
                ]}
              >
                <Ionicons
                  name={name as never}
                  size={20}
                  color={selectedIcon ? color : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Couleur</Text>
        <View style={styles.colorRow}>
          {WAR_COLOR_CHOICES.map((value) => (
            <Pressable
              key={value}
              onPress={() => setColor(value)}
              style={[
                styles.colorSwatch,
                {
                  backgroundColor: value,
                  borderWidth: value === color ? 3 : 0,
                  borderColor: colors.text,
                },
              ]}
            >
              {value === color ? (
                <Ionicons name="checkmark" size={16} color="#0B0D12" />
              ) : null}
            </Pressable>
          ))}
        </View>

        <Button
          label={isEdit ? 'Enregistrer' : 'Créer la guerre'}
          onPress={save}
          loading={saving}
          disabled={!title.trim()}
          fullWidth
          style={{ marginTop: spacing[5] }}
        />

        {isEdit && war ? (
          <Button
            label="Supprimer la guerre"
            variant="danger"
            fullWidth
            style={{ marginTop: spacing[3] }}
            onPress={() => onRequestDelete(war)}
          />
        ) : null}

        {!isEdit && inactiveWars.length > 0 ? (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Guerres en pause ({inactiveWars.length})
            </Text>
            {inactiveWars.map((item) => (
              <View
                key={item.id}
                style={[styles.manageRow, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              >
                <Ionicons name={item.icon as never} size={18} color={item.color} />
                <Text
                  numberOfLines={1}
                  style={[styles.manageRowTitle, { color: colors.textMuted }]}
                >
                  {item.title}
                </Text>
                <Button
                  label="Réactiver"
                  variant="glass"
                  size="sm"
                  onPress={() => toggleActive(item)}
                />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

// ─── Sheet : création / modification de bataille ──────────
function BattleSheet({
  visible,
  war,
  battle,
  onClose,
  onRequestDelete,
}: {
  visible: boolean;
  war: WarRow;
  battle: BattleRow | null;
  onClose: () => void;
  onRequestDelete: (battle: BattleRow) => void;
}) {
  const { colors } = useTheme().theme;
  const isEdit = !!battle;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadlineDays, setDeadlineDays] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(battle?.title ?? '');
      setDescription(battle?.description ?? '');
      setPriority(battle?.priority ?? 'medium');
      if (battle?.deadline) {
        const days = Math.round((battle.deadline - Date.now()) / 86_400_000);
        setDeadlineDays(days > 0 ? days : 0);
      } else {
        setDeadlineDays(isEdit ? 0 : 30);
      }
      setSaving(false);
    }
  }, [visible, battle, isEdit]);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const deadline = deadlineDays ? new Date(Date.now() + deadlineDays * 86_400_000) : null;
      if (isEdit && battle) {
        await editBattle(battle.id, { title, description, priority, deadline });
      } else {
        await addBattle({
          warId: war.id,
          title,
          description,
          priority,
          deadline,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title={isEdit ? 'Modifier la bataille' : 'Nouvelle bataille'} onClose={onClose}>
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
        label={isEdit ? 'Enregistrer' : 'Créer la bataille'}
        onPress={save}
        loading={saving}
        disabled={!title.trim()}
        fullWidth
        style={{ marginTop: spacing[5] }}
      />
      {isEdit && battle ? (
        <Button
          label="Supprimer la bataille"
          variant="danger"
          fullWidth
          style={{ marginTop: spacing[3] }}
          onPress={() => onRequestDelete(battle)}
        />
      ) : null}
    </Sheet>
  );
}

// ─── Sheet : détail d'une bataille ────────────────────────
function BattleDetailSheet({
  battle,
  onClose,
  onAddTemplate,
  onAddQuick,
  onEditTemplate,
  onEditInstance,
  onDeleteTemplate,
  onDeleteInstance,
}: {
  battle: BattleRow | null;
  onClose: () => void;
  onAddTemplate: (battle: BattleRow) => void;
  onAddQuick: (battle: BattleRow) => void;
  onEditTemplate: (battle: BattleRow, template: AdversaryTemplateRow) => void;
  onEditInstance: (battle: BattleRow, instance: AdversaryRow) => void;
  onDeleteTemplate: (template: AdversaryTemplateRow) => void;
  onDeleteInstance: (instance: AdversaryRow) => void;
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

  const activeTemplates = useMemo(
    () => (detail?.templates ?? []).filter((template) => template.is_active),
    [detail],
  );

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
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {activeTemplates.length} routine(s) · {detail.progress.won}/{detail.progress.total} victoires
          </Text>

          {activeTemplates.length === 0 && upcoming.length === 0 ? (
            <Text style={[styles.emptyDetail, { color: colors.textMuted }]}>
              Aucun adversaire programmé. Ajoute une routine récurrente ou une mission ponctuelle.
            </Text>
          ) : null}

          {activeTemplates.map((template) => (
            <View
              key={template.id}
              style={[styles.templateRow, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
            >
              <Ionicons name="repeat" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.instanceTitle, { color: colors.text }]}>
                  {template.title}
                </Text>
                <Text style={[styles.instanceMeta, { color: colors.textMuted }]}>
                  {FREQUENCY_LABELS[template.frequency]} · {template.hour}h · +{template.xp_reward} XP
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Modifier la routine ${template.title}`}
                onPress={() => battle && onEditTemplate(battle, template)}
                hitSlop={10}
              >
                <Ionicons name="create-outline" size={18} color={colors.textMuted} />
              </Pressable>
              <Pressable
                accessibilityLabel={`Arrêter la routine ${template.title}`}
                onPress={() => onDeleteTemplate(template)}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          {upcoming.map((adversary) => {
            const isManual = adversary.template_id === null;
            return (
              <View
                key={adversary.id}
                style={[
                  styles.instanceRow,
                  { backgroundColor: colors.glass, borderColor: colors.glassBorder },
                ]}
              >
                <Pressable
                  style={styles.instanceMain}
                  onPress={() => handleWin(adversary)}
                  accessibilityRole="button"
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
                {isManual ? (
                  <View style={styles.instanceActions}>
                    <Pressable
                      accessibilityLabel="Modifier la mission"
                      onPress={() => battle && onEditInstance(battle, adversary)}
                      hitSlop={10}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Supprimer la mission"
                      onPress={() => onDeleteInstance(adversary)}
                      hitSlop={10}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

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

// ─── Sheet : routine récurrente (création / modification) ─
function TemplateSheet({
  battle,
  template,
  onClose,
}: {
  battle: BattleRow | null;
  template: AdversaryTemplateRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme().theme;
  const isEdit = !!template;
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [days, setDays] = useState<number[]>([1]);
  const [hour, setHour] = useState(8);
  const [xp, setXp] = useState('50');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (battle) {
      setTitle(template?.title ?? '');
      setFrequency(template?.frequency ?? 'daily');
      setDays(template ? safeParseDays(template.specific_days) : [1]);
      setHour(template?.hour ?? 8);
      setXp(String(template?.xp_reward ?? 50));
      setSaving(false);
    }
  }, [battle, template]);

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  };

  const save = async () => {
    if (!battle || !title.trim() || saving) return;
    setSaving(true);
    try {
      if (isEdit && template) {
        await editTemplate(template.id, {
          title,
          frequency,
          specificDays: frequency === 'specific_days' ? days : undefined,
          hour,
          xpReward: Number(xp) || 50,
        });
      } else {
        await addTemplate({
          battleId: battle.id,
          title,
          frequency,
          specificDays: frequency === 'specific_days' ? days : undefined,
          hour,
          xpReward: Number(xp) || 50,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={!!battle} title={isEdit ? 'Modifier la routine' : 'Routine récurrente'} onClose={onClose}>
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
          .filter((f) => f !== 'yearly' && f !== 'once')
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
        label={isEdit ? 'Enregistrer' : 'Programmer la routine'}
        onPress={save}
        loading={saving}
        disabled={!title.trim() || (frequency === 'specific_days' && days.length === 0)}
        fullWidth
        style={{ marginTop: spacing[5] }}
      />
    </Sheet>
  );
}

function safeParseDays(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => n >= 1 && n <= 7) : [1];
  } catch {
    return [1];
  }
}

// ─── Sheet : mission ponctuelle (création / modification) ─
function QuickAdversarySheet({
  battle,
  instance,
  onClose,
  onRequestDelete,
}: {
  battle: BattleRow | null;
  instance: AdversaryRow | null;
  onClose: () => void;
  onRequestDelete: (instance: AdversaryRow) => void;
}) {
  const { colors } = useTheme().theme;
  const isEdit = !!instance;
  const [title, setTitle] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState(18);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (battle) {
      setTitle(instance?.title ?? '');
      if (instance) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thatDay = new Date(instance.scheduled_at);
        thatDay.setHours(0, 0, 0, 0);
        setDayOffset(Math.round((thatDay.getTime() - today.getTime()) / 86_400_000));
        setHour(instance.hour);
      } else {
        setDayOffset(0);
        setHour(18);
      }
      setSaving(false);
    }
  }, [battle, instance]);

  const save = async () => {
    if (!battle || !title.trim() || saving) return;
    setSaving(true);
    try {
      const when = new Date();
      when.setDate(when.getDate() + dayOffset);
      when.setHours(hour, 0, 0, 0);
      if (isEdit && instance) {
        await editManualInstance(instance.id, { title, scheduledAt: when });
      } else {
        await addQuickAdversary({ battleId: battle.id, title, scheduledAt: when });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={!!battle} title={isEdit ? 'Modifier la mission' : 'Mission ponctuelle'} onClose={onClose}>
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
        label={isEdit ? 'Enregistrer' : 'Ajouter la mission'}
        onPress={save}
        loading={saving}
        disabled={!title.trim()}
        fullWidth
        style={{ marginTop: spacing[5] }}
      />
      {isEdit && instance ? (
        <Button
          label="Supprimer la mission"
          variant="danger"
          fullWidth
          style={{ marginTop: spacing[3] }}
          onPress={() => onRequestDelete(instance)}
        />
      ) : null}
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
  instanceMain: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  instanceActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
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
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  detailActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
    marginBottom: spacing[2],
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[2] },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  manageRowTitle: { flex: 1, fontSize: typography.sizes.base, fontWeight: '700' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { fontSize: typography.sizes.md, lineHeight: 23, color: '#9AA1B8' },
});
