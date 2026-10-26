/**
 * GBECHE — Agent de quartier général (100 % local, réponses automatiques).
 * Conversation persistée dans chat_messages ; aucune donnée ne sort de
 * l'appareil. L'agent répond avec les chiffres réels (solde, missions,
 * série, guerres) via un moteur de règles déterministe.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import { radius, spacing, typography } from '@/src/theme';
import * as Haptics from '@/src/services/haptics';
import {
  addMessage,
  clearChat,
  listMessages,
  type ChatMessageRow,
} from '@/src/db/repositories/chat.repo';
import { getTotalBalance } from '@/src/db/repositories/accounts.repo';
import {
  getDayStats,
  listInstancesForDay,
} from '@/src/db/repositories/adversaries.repo';
import { listWars } from '@/src/db/repositories/wars.repo';
import { getWarriorProfile } from '@/src/services/gamification.service';
import {
  generateReply,
  SUGGESTIONS,
  welcomeMessage,
  type AgentContext,
} from '@/src/services/agent.service';

export default function AgentScreen() {
  const { colors } = useTheme().theme;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const messagesQuery = useRepoQuery(() => listMessages(), []);
  const messages = messagesQuery.data ?? [];
  const balanceQuery = useRepoQuery(() => getTotalBalance(), []);
  const dayStatsQuery = useRepoQuery(() => getDayStats(new Date()), []);
  const instancesQuery = useRepoQuery(() => listInstancesForDay(new Date()), []);
  const warsQuery = useRepoQuery(() => listWars(true), []);
  const profileQuery = useRepoQuery(() => getWarriorProfile(), []);

  const context = useMemo<AgentContext>(
    () => ({
      balance: balanceQuery.data ?? null,
      pendingToday:
        (instancesQuery.data ?? []).filter((i) => i.status === 'pending' || i.status === 'rescheduled')
          .length,
      wonToday: dayStatsQuery.data?.won ?? 0,
      level: profileQuery.data?.level ?? 1,
      streak: profileQuery.data?.streak ?? 0,
      activeWars: (warsQuery.data ?? []).length,
    }),
    [balanceQuery.data, instancesQuery.data, dayStatsQuery.data, profileQuery.data, warsQuery.data],
  );

  // Message d'accueil automatique à la première ouverture.
  useEffect(() => {
    if (messagesQuery.status === 'ready' && messages.length === 0) {
      addMessage('agent', welcomeMessage(context), ['welcome']).catch(() => {});
    }
    // Uniquement lors du premier rendu « prêt » d'une conversation vide.
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const reply = generateReply(text, context);
      await addMessage('user', text, []);
      await addMessage('agent', reply.text, [reply.intent]);
    } catch (error) {
      console.error('[agent]', error);
      await addMessage('agent', "Une erreur est survenue, mais tes données sont intactes. Réessaie.", [
        'error',
      ]);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    await clearChat();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen padded={false}>
      <View style={[styles.header, { padding: spacing[5], paddingBottom: spacing[3] }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Agent de quartier général</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Réponses automatiques · 100 % hors-ligne
          </Text>
        </View>
        {messages.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Effacer la conversation"
            onPress={reset}
            hitSlop={10}
            style={[styles.resetBtn, { borderColor: colors.glassBorder }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[4], gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message: ChatMessageRow) => (
            <View
              key={message.id}
              style={[
                styles.bubbleRow,
                message.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
              ]}
            >
              {message.role === 'agent' ? (
                <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                </View>
              ) : null}
              <GlassCard
                animated={false}
                noPadding
                style={[
                  styles.bubble,
                  message.role === 'user'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.glass, borderColor: colors.glassBorder },
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: message.role === 'user' ? colors.textInverse : colors.text },
                  ]}
                >
                  {message.text}
                </Text>
              </GlassCard>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.composer, { borderColor: colors.glassBorder, backgroundColor: colors.backgroundElevated }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
            {SUGGESTIONS.slice(0, 4).map((suggestion) => (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                onPress={() => send(suggestion)}
                style={[styles.suggestChip, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
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
              placeholder="Pose ta question…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  title: { fontSize: typography.sizes['2xl'], fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: typography.sizes.sm, marginTop: 2, fontWeight: '600' },
  resetBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], maxWidth: '100%' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  bubbleText: { fontSize: typography.sizes.md, lineHeight: 22, fontWeight: '600' },
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
