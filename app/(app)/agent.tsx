/**
 * GBECHE — Agent de quartier général (100 % local, conversationnel).
 *
 * L'agent transforme le langage naturel en actions : dépenses, revenus,
 * budgets, missions, victoires et comptes. Les écritures passent toujours
 * par une carte de confirmation (jamais de saisie silencieuse) et la
 * conversation reste persistée dans chat_messages. Aucune donnée ne sort
 * de l'appareil : le moteur de règles est entièrement hors-ligne.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import { radius, spacing, typography } from '@/src/theme';
import * as Haptics from '@/src/services/haptics';
import {
  addMessage,
  clearChat,
  listMessages,
  setMessageStatus,
  type ChatMessageRow,
  type ChatMessageStatus,
} from '@/src/db/repositories/chat.repo';
import { welcomeMessage } from '@/src/services/agent.service';
import {
  COMMAND_SUGGESTIONS,
  describeAction,
  parseCommand,
  type AgentAction,
} from '@/src/services/agent/agentCommand';
import {
  buildDayReview,
  buildFinanceReview,
  executeAgentAction,
  getAgentSnapshot,
} from '@/src/services/agent/agentActions.service';
import {
  applyAnswer,
  buildPlan,
  currentQuestion,
  guideOfDraft,
  isCancelRequest,
  isDraftComplete,
  shouldOpenAspiration,
  startDraft,
  type LifeDraft,
} from '@/src/services/agent/lifeProject.service';
import { clearDraft, getActiveDraft, upsertDraft } from '@/src/db/repositories/lifeDrafts.repo';

function parsePayload(message: ChatMessageRow): AgentAction[] {
  try {
    const parsed = JSON.parse(message.payload_json ?? '[]');
    return Array.isArray(parsed) ? (parsed as AgentAction[]) : [];
  } catch {
    return [];
  }
}

export default function AgentScreen() {
  const { colors } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // Pastilles de réponse rapide : questions de choix d'un projet de vie,
  // sinon suggestions de commandes classiques.
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const messagesQuery = useRepoQuery(() => listMessages(), []);
  const messages = messagesQuery.data ?? [];
  const snapshotQuery = useRepoQuery(() => getAgentSnapshot(), []);
  const snapshot = snapshotQuery.data;

  // Message d'accueil automatique à la première ouverture.
  useEffect(() => {
    if (messagesQuery.status === 'ready' && messages.length === 0) {
      addMessage(
        'agent',
        welcomeMessage({
          balance: snapshot?.balance ?? null,
          pendingToday: snapshot?.day.pending ?? 0,
        }),
        ['welcome'],
      ).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesQuery.status]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft('');
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await addMessage('user', text, []);

      // Un projet de vie est en cours de construction : la phrase est une
      // réponse aux questions de l'agent, pas une commande classique.
      const activeDraft = await getActiveDraft();
      if (activeDraft) {
        await handleDraftAnswer(activeDraft, text);
        return;
      }

      const parsed = parseCommand(text);

      if (parsed.intent === 'day-review' && snapshot) {
        await addMessage('agent', buildDayReview(snapshot), ['day-review']);
      } else if (parsed.intent === 'finance-review' && snapshot) {
        await addMessage('agent', buildFinanceReview(snapshot), ['finance-review']);
      } else if (parsed.kind === 'actions' && parsed.actions && parsed.actions.length > 0) {
        await addMessage('agent', parsed.text, [parsed.intent], parsed.actions, 'proposed');
      } else {
        // Aucune action : l'aspiration ouvre un dialogue guidé seulement
        // si un guide reconnaît la phrase et que le parseur ne réclamait
        // pas déjà un montant (sinon on garde sa réponse informative).
        const guide = shouldOpenAspiration(parsed, text);
        if (guide) {
          const newDraft = startDraft(guide.id);
          await upsertDraft(newDraft);
          const first = guide.questions[0];
          setQuickReplies(first.choices ?? []);
          await addMessage(
            'agent',
            `${guide.pitch}\n\n1/${guide.questions.length} — ${first.label}${
              first.hint ? `\n${first.hint}` : ''
            }\n\n(Réponds « annuler » à tout moment pour interrompre.)`,
            ['life-aspiration', guide.id],
          );
          return;
        }
        await addMessage('agent', parsed.text, [parsed.intent]);
      }
    } catch (error) {
      console.error('[agent]', error);
      await addMessage(
        'agent',
        "Une erreur est survenue, mais tes données sont intactes. Réessaie.",
        ['error'],
      );
    } finally {
      setBusy(false);
    }
  };

  /** Avance le dialogue d'un projet de vie jusqu'à la carte de plan à valider. */
  const handleDraftAnswer = async (active: LifeDraft, text: string) => {
    const guide = guideOfDraft(active);
    if (!guide) {
      await clearDraft();
      setQuickReplies([]);
      await addMessage(
        'agent',
        "Désolé, j'ai perdu le fil de ce projet. Reformule ton objectif, on recommence.",
        ['error'],
      );
      return;
    }

    if (isCancelRequest(text)) {
      await clearDraft();
      setQuickReplies([]);
      await addMessage(
        'agent',
        `Projet « ${guide.title} » interrompu. Je n'ai rien créé ni modifié.`,
        ['life-cancel'],
      );
      return;
    }

    const outcome = applyAnswer(active, text, guide);
    if (outcome.error) {
      const question = currentQuestion(active, guide);
      setQuickReplies(question?.choices ?? []);
      await addMessage('agent', `${outcome.error}\n\n${question?.label ?? ''}`, ['life-clarification']);
      return;
    }

    await upsertDraft(outcome.draft);

    if (!isDraftComplete(outcome.draft, guide)) {
      const question = currentQuestion(outcome.draft, guide);
      setQuickReplies(question?.choices ?? []);
      await addMessage(
        'agent',
        `${outcome.draft.stepIndex + 1}/${guide.questions.length} — ${question?.label ?? ''}`,
        ['life-clarification'],
      );
      return;
    }

    // Toutes les réponses sont réunies : résumé + carte de confirmation.
    const plan = buildPlan(guide, outcome.draft);
    await clearDraft();
    setQuickReplies([]);
    await addMessage(
      'agent',
      plan.summary,
      ['life-plan', guide.id],
      [{ type: 'create-life-plan', plan }],
      'proposed',
    );
  };

  const confirm = async (message: ChatMessageRow) => {
    const actions = parsePayload(message);
    if (actions.length === 0 || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const results: string[] = [];
      let recovery: AgentAction | undefined;
      for (const action of actions) {
        const result = await executeAgentAction(action);
        results.push(result.message);
        if (result.recovery) recovery = result.recovery;
      }
      await setMessageStatus(message.id, 'confirmed');
      await addMessage('agent', results.join('\n'), ['action-result']);
      if (recovery) {
        await addMessage(
          'agent',
          'Crée ce compte puis confirme à nouveau ta saisie dans un nouveau message.',
          ['recovery'],
          [recovery],
          'proposed',
        );
      }
    } catch (error) {
      console.error('[agent]', error);
      await addMessage('agent', "L'action n'a pas pu aboutir. Aucune donnée n'a été perdue.", ['error']);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (message: ChatMessageRow) => {
    Haptics.selectionAsync().catch(() => {});
    await setMessageStatus(message.id, 'cancelled');
    await addMessage('agent', 'Noté, je n’ai rien modifié.', ['cancelled']);
  };

  const reset = async () => {
    await clearChat();
    await clearDraft();
    setQuickReplies([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen padded={false}>
      <ScreenHeader
        title="Agent"
        subtitle="Discute pour tout faire · 100 % hors-ligne"
        left={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        }
        right={
          messages.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Effacer la conversation"
              onPress={reset}
              hitSlop={10}
              style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[4], gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          {messages.map((message: ChatMessageRow) => (
            <MessageBubble
              key={message.id}
              message={message}
              onConfirm={confirm}
              onCancel={cancel}
              busy={busy}
            />
          ))}
        </ScrollView>

        <View
          style={[
            styles.composer,
            {
              borderColor: colors.glassBorder,
              backgroundColor: colors.backgroundElevated,
              paddingBottom: Math.max(insets.bottom, spacing[3]),
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestRow}
            keyboardShouldPersistTaps="handled"
          >
            {(quickReplies.length > 0 ? quickReplies : COMMAND_SUGGESTIONS).map((suggestion) => (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                onPress={() => send(suggestion)}
                style={[
                  styles.suggestChip,
                  { backgroundColor: colors.glass, borderColor: colors.glassBorder },
                ]}
              >
                <Text style={[styles.suggestText, { color: colors.primary }]} numberOfLines={1}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Raconte ou demande… (« j’ai dépensé 2 000 FCFA »)"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder },
              ]}
              onSubmitEditing={() => send(draft)}
              returnKeyType="send"
              accessibilityLabel="Message à l'agent"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
              onPress={() => send(draft)}
              disabled={!draft.trim() || busy}
              style={[
                styles.sendBtn,
                { backgroundColor: colors.primary, opacity: draft.trim() && !busy ? 1 : 0.4 },
              ]}
            >
              <Ionicons name="send" size={20} color={colors.textInverse} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
  busy,
}: {
  message: ChatMessageRow;
  onConfirm: (message: ChatMessageRow) => void;
  onCancel: (message: ChatMessageRow) => void;
  busy: boolean;
}) {
  const { colors } = useTheme().theme;
  const actions = parsePayload(message);
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        </View>
      ) : null}
      <GlassCard
        animated={false}
        noPadding
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: colors.glass, borderColor: colors.glassBorder },
        ]}
      >
        <View style={styles.bubbleInner}>
          <Text style={[styles.bubbleText, { color: isUser ? colors.textInverse : colors.text }]}>
            {message.text}
          </Text>
          {actions.length > 0 ? (
            <ActionCard
              actions={actions}
              status={message.status as ChatMessageStatus}
              onConfirm={() => onConfirm(message)}
              onCancel={() => onCancel(message)}
              busy={busy}
            />
          ) : null}
        </View>
      </GlassCard>
    </View>
  );
}

function ActionCard({
  actions,
  status,
  onConfirm,
  onCancel,
  busy,
}: {
  actions: AgentAction[];
  status: ChatMessageStatus;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const { colors } = useTheme().theme;

  if (status === 'confirmed') {
    return (
      <View style={styles.resultLine}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={[styles.resultText, { color: colors.textMuted }]}>
          Confirmé — {actions.length} action{actions.length > 1 ? 's' : ''} appliquée{actions.length > 1 ? 's' : ''}
        </Text>
      </View>
    );
  }
  if (status === 'cancelled') {
    return (
      <View style={styles.resultLine}>
        <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
        <Text style={[styles.resultText, { color: colors.textTertiary }]}>Annulée</Text>
      </View>
    );
  }

  return (
    <View style={[styles.actionCard, { borderColor: colors.glassBorder, backgroundColor: colors.background }]}>
      {actions.map((action, index) => {
        const descriptor = describeAction(action);
        return (
          <View
            key={`${action.type}-${index}`}
            style={[styles.actionRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name={descriptor.icon as never} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{descriptor.title}</Text>
              <Text style={[styles.actionDetail, { color: colors.textMuted }]} numberOfLines={2}>
                {descriptor.detail}
              </Text>
            </View>
          </View>
        );
      })}
      <View style={styles.actionButtons}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          disabled={busy}
          style={[styles.cancelBtn, { borderColor: colors.glassBorder }]}
        >
          <Text style={[styles.cancelText, { color: colors.textMuted }]}>Annuler</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          disabled={busy}
          style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: busy ? 0.5 : 1 }]}
        >
          <Ionicons name="checkmark" size={17} color={colors.textInverse} />
          <Text style={[styles.confirmText, { color: colors.textInverse }]}>
            {actions.length > 1 ? `Tout confirmer (${actions.length})` : 'Confirmer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], maxWidth: '100%' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '85%', borderRadius: radius.lg },
  bubbleInner: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[2] },
  bubbleText: { fontSize: typography.sizes.md, lineHeight: 22, fontWeight: '600' },
  actionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing[1],
    overflow: 'hidden',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3] },
  actionIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: typography.sizes.sm, fontWeight: '800' },
  actionDetail: { fontSize: typography.sizes.xs, fontWeight: '600', marginTop: 1 },
  actionButtons: { flexDirection: 'row', gap: spacing[2], padding: spacing[3], paddingTop: spacing[2] },
  cancelBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: typography.sizes.sm, fontWeight: '700' },
  confirmBtn: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmText: { fontSize: typography.sizes.sm, fontWeight: '800' },
  resultLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  resultText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  composer: { borderTopWidth: 1, paddingTop: spacing[2], paddingBottom: spacing[4] },
  suggestRow: { paddingHorizontal: spacing[5], gap: spacing[2], paddingBottom: spacing[2] },
  suggestChip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 6 },
  suggestText: { fontSize: typography.sizes.sm, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[5] },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  sendBtn: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
