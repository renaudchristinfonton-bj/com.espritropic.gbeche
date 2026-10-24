/**
 * GBECHE — Onboarding 5 étapes.
 * Chaque étape écrit réellement dans SQLite / SecureStore :
 *  1. Manifeste      2. Forteresse (PIN + biométrie)
 *  3. Recensement (comptes + soldes initiaux)
 *  4. Déclaration de guerre (domaines actifs + custom)
 *  5. Pacte (préférence de notifications) → finalisation
 */

import React, { useMemo, useState } from 'react';
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
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/theme/ThemeContext';
import { Button } from '@/src/components/ui/Button';
import { PinPad } from '@/src/components/ui/PinPad';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import { listWars, setWarActive, createWar } from '@/src/db/repositories/wars.repo';
import { createAccount } from '@/src/db/repositories/accounts.repo';
import { setSetting, setSettingBool, SETTING_KEYS } from '@/src/db/settings';
import {
  ensureMasterKey,
  getBiometricAvailability,
  requestBiometric,
  setPin,
} from '@/src/services/security';
import { ACCOUNT_PRESETS } from '@/src/domain/catalog';
import { radius, spacing, typography } from '@/src/theme';

type Step = 1 | 2 | 3 | 4 | 5;

export default function Onboarding() {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 2 — PIN
  const [pin, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMode, setPinMode] = useState<'create' | 'confirm'>('create');
  const [pinError, setPinError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState<
    Awaited<ReturnType<typeof getBiometricAvailability>> | null
  >(null);

  // Step 3 — comptes
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

  // Step 4 — guerres
  const warsQuery = useRepoQuery(() => listWars(false), []);
  const [customWarTitle, setCustomWarTitle] = useState('');

  // Step 5
  const [notifEnabled, setNotifEnabled] = useState(true);

  const progress = useMemo(() => step / 5, [step]);

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  };

  const back = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 2) {
      setPinMode('create');
      setPinValue('');
      setPinConfirm('');
      setPinError(false);
    }
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  // ─── Step 2 handlers ─────────────────────────────────────
  const handlePinFull = async (value: string) => {
    if (pinMode === 'create') {
      setPinValue(value);
      setPinMode('confirm');
      setTimeout(() => setPinConfirm(''), 50);
      return;
    }
    if (value !== pin) {
      setPinError(true);
      setPinConfirm('');
      setTimeout(() => setPinError(false), 600);
      return;
    }
    setPinConfirm(value);
    setPinError(false);
    const availability = await getBiometricAvailability();
    setBiometricAvailable(availability);
  };

  const enableBiometric = async () => {
    const ok = await requestBiometric('Sécurise ton Quartier Général');
    if (ok) {
      await setSettingBool(SETTING_KEYS.biometricEnabled, true);
      setBiometricAvailable((prev) => (prev ? { ...prev, enrolled: true } : prev));
    }
  };

  // ─── Finalisation ────────────────────────────────────────
  const finish = async () => {
    setSubmitting(true);
    try {
      await ensureMasterKey();
      await setPin(pin);

      for (const preset of ACCOUNT_PRESETS) {
        const raw = selectedAccounts[preset.name];
        if (raw === undefined) continue;
        const balance = Number(raw.replace(/\s/g, '')) || 0;
        await createAccount({
          name: preset.name,
          type: preset.type,
          icon: preset.icon,
          color: preset.color,
          initialBalance: balance,
        });
      }

      if (customWarTitle.trim()) {
        await createWar({
          title: customWarTitle.trim(),
          icon: 'flag',
          color: '#00E5FF',
          domainType: 'custom',
        });
      }

      // La préférence est conservée ; la permission système et les
      // notifications locales seront activées en Phase 2 (setup FCM v1).
      await setSettingBool(SETTING_KEYS.notificationsEnabled, notifEnabled);
      await setSetting(SETTING_KEYS.warriorName, 'Guerrier');
      await setSettingBool(SETTING_KEYS.onboardingDone, true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(app)/home');
    } catch (error) {
      console.error('[onboarding]', error);
      setSubmitting(false);
    }
  };

  // ─── Rendu ───────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {step > 1 ? (
            <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={[styles.progressTrack, { backgroundColor: colors.glass }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.stepLabel, { color: colors.textMuted }]}>{step}/5</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={step} entering={FadeInRight.duration(320)} style={styles.flex}>
            {step === 1 && <StepManifesto onNext={next} />}
            {step === 2 && (
              <StepFortress
                pinMode={pinMode}
                pin={pinMode === 'create' ? pin : pinConfirm}
                error={pinError}
                onPin={handlePinFull}
                biometric={biometricAvailable}
                onBiometric={enableBiometric}
                onNext={next}
              />
            )}
            {step === 3 && (
              <StepCensus selected={selectedAccounts} onToggle={setSelectedAccounts} onNext={next} />
            )}
            {step === 4 && (
              <StepWar
                wars={warsQuery.data ?? []}
                onToggleActive={async (id, active) => {
                  await setWarActive(id, active);
                }}
                customTitle={customWarTitle}
                onCustomTitle={setCustomWarTitle}
                onNext={next}
              />
            )}
            {step === 5 && (
              <StepCovenant
                enabled={notifEnabled}
                onToggle={setNotifEnabled}
                onFinish={finish}
                loading={submitting}
              />
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Étape 1 : Manifeste ──────────────────────────────────
function StepManifesto({ onNext }: { onNext: () => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.center}>
      <LinearGradient
        colors={['rgba(0,229,255,0.18)', 'rgba(99,102,241,0.12)']}
        style={styles.heroCircle}
      >
        <Ionicons name="shield-checkmark" size={72} color={colors.primary} />
      </LinearGradient>
      <Text style={[styles.heroTitle, { color: colors.text }]}>Le chaos s'arrête ici.</Text>
      <Text style={[styles.heroSub, { color: colors.textMuted }]}>
        GBECHE n'est pas une simple liste de tâches. C'est ton quartier général :
        tes guerres, tes batailles, tes victoires — tout reste dans ton téléphone.
      </Text>
      <Button label="Prendre le commandement" onPress={onNext} size="lg" fullWidth />
    </View>
  );
}

// ─── Étape 2 : Forteresse ─────────────────────────────────
function StepFortress({
  pinMode,
  pin,
  error,
  onPin,
  biometric,
  onBiometric,
  onNext,
}: {
  pinMode: 'create' | 'confirm';
  pin: string;
  error: boolean;
  onPin: (pin: string) => void;
  biometric: Awaited<ReturnType<typeof getBiometricAvailability>> | null;
  onBiometric: () => void;
  onNext: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const complete = pinMode === 'confirm' && pin.length === 4 && !error;

  return (
    <View style={styles.center}>
      <Ionicons name="lock-closed" size={48} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>
        {pinMode === 'create' ? 'Crée ton code PIN' : 'Confirme ton code PIN'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        4 chiffres. Ce qui se passe dans GBECHE reste dans GBECHE.
      </Text>

      <PinPad value={pin} onChange={() => {}} onFull={onPin} error={error} />

      {biometric?.enrolled ? (
        <Pressable onPress={onBiometric} style={styles.biometricRow}>
          <Ionicons
            name="finger-print"
            size={22}
            color={colors.success}
          />
          <Text style={[styles.biometricText, { color: colors.success }]}>
            Activer {biometric.kind === 'faceId' ? 'Face ID' : "l'empreinte digitale"}
          </Text>
        </Pressable>
      ) : null}

      <View style={{ marginTop: spacing[6], width: '100%' }}>
        <Button
          label="Continuer"
          onPress={onNext}
          size="lg"
          fullWidth
          disabled={!complete}
        />
      </View>
    </View>
  );
}

// ─── Étape 3 : Recensement ────────────────────────────────
function StepCensus({
  selected,
  onToggle,
  onNext,
}: {
  selected: Record<string, string>;
  onToggle: (next: Record<string, string>) => void;
  onNext: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.title, { color: colors.text }]}>Quelles sont tes réserves ?</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Sélectionne tes comptes et indique tes soldes actuels. Tu pourras tout modifier plus tard.
      </Text>

      {ACCOUNT_PRESETS.map((preset) => {
        const active = preset.name in selected;
        return (
          <View
            key={preset.name}
            style={[
              styles.accountRow,
              {
                backgroundColor: active ? `${preset.color}14` : colors.glass,
                borderColor: active ? preset.color : colors.glassBorder,
              },
            ]}
          >
            <Pressable
              style={styles.accountHead}
              onPress={() => {
                const nextValues = { ...selected };
                if (active) delete nextValues[preset.name];
                else nextValues[preset.name] = '';
                onToggle(nextValues);
              }}
            >
              <View style={[styles.accountIcon, { backgroundColor: `${preset.color}1F` }]}>
                <Ionicons name={preset.icon} size={20} color={preset.color} />
              </View>
              <Text style={[styles.accountName, { color: colors.text }]}>{preset.name}</Text>
              <Ionicons
                name={active ? 'checkmark-circle' : 'add-circle-outline'}
                size={24}
                color={active ? preset.color : colors.textMuted}
              />
            </Pressable>
            {active ? (
              <TextInput
                value={selected[preset.name]}
                onChangeText={(text) =>
                  onToggle({ ...selected, [preset.name]: text.replace(/[^0-9]/g, '') })
                }
                placeholder="Solde initial (FCFA)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={[styles.balanceInput, { color: colors.text, borderColor: colors.glassBorder }]}
              />
            ) : null}
          </View>
        );
      })}

      <View style={{ marginTop: spacing[6] }}>
        <Button label="Continuer" onPress={onNext} size="lg" fullWidth />
      </View>
    </View>
  );
}

// ─── Étape 4 : Déclaration de guerre ──────────────────────
function StepWar({
  wars,
  onToggleActive,
  customTitle,
  onCustomTitle,
  onNext,
}: {
  wars: import('@/src/db/types').WarRow[];
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  customTitle: string;
  onCustomTitle: (v: string) => void;
  onNext: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.title, { color: colors.text }]}>Choisis tes premières guerres</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Active les domaines que tu veux conquérir. Tu peux aussi créer ton propre domaine.
      </Text>

      <View style={styles.warGrid}>
        {wars.map((war) => (
          <Pressable
            key={war.id}
            onPress={() => onToggleActive(war.id, !war.is_active)}
            style={[
              styles.warChip,
              {
                backgroundColor: war.is_active ? `${war.color}16` : colors.glass,
                borderColor: war.is_active ? war.color : colors.glassBorder,
              },
            ]}
          >
            <Ionicons name={war.icon as never} size={22} color={war.color} />
            <Text
              numberOfLines={2}
              style={[styles.warLabel, { color: war.is_active ? colors.text : colors.textMuted }]}
            >
              {war.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.customWar, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
        <Ionicons name="flag-outline" size={20} color={colors.primary} />
        <TextInput
          value={customTitle}
          onChangeText={onCustomTitle}
          placeholder="Ou crée ton propre domaine"
          placeholderTextColor={colors.textTertiary}
          style={[styles.customInput, { color: colors.text }]}
        />
      </View>

      <View style={{ marginTop: spacing[6] }}>
        <Button label="Continuer" onPress={onNext} size="lg" fullWidth />
      </View>
    </View>
  );
}

// ─── Étape 5 : Pacte ──────────────────────────────────────
function StepCovenant({
  enabled,
  onToggle,
  onFinish,
  loading,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onFinish: () => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.center}>
      <Animated.View entering={FadeIn.duration(500)}>
        <LinearGradient
          colors={['rgba(255,107,53,0.18)', 'rgba(255,71,87,0.10)']}
          style={styles.heroCircle}
        >
          <Ionicons name="notifications" size={64} color={colors.accent} />
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.title, { color: colors.text }]}>Le pacte de discipline</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        « Je serai ton ombre. Si tu dévies, je te ramènerai. » Active les rappels de
        discipline : la permission système te sera demandée à l'arrivée des notifications.
      </Text>

      <Pressable
        onPress={() => onToggle(!enabled)}
        style={[
          styles.notifRow,
          {
            backgroundColor: enabled ? colors.successDim : colors.glass,
            borderColor: enabled ? colors.success : colors.glassBorder,
          },
        ]}
      >
        <Ionicons
          name={enabled ? 'notifications-circle' : 'notifications-off'}
          size={26}
          color={enabled ? colors.success : colors.textMuted}
        />
        <Text style={[styles.notifLabel, { color: colors.text }]}>
          Rappels et alertes de discipline
        </Text>
        <Ionicons
          name={enabled ? 'toggle' : 'toggle-outline'}
          size={30}
          color={enabled ? colors.success : colors.textMuted}
        />
      </Pressable>

      <View style={{ marginTop: spacing[8], width: '100%' }}>
        <Button
          label="Entrer au Quartier Général"
          onPress={onFinish}
          size="lg"
          fullWidth
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  stepLabel: { fontSize: typography.sizes.base, fontWeight: '700', width: 32, textAlign: 'right' },
  content: {
    padding: spacing[5],
    paddingBottom: spacing[12],
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingVertical: spacing[8],
  },
  heroCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  heroTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: typography.sizes.md,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing[8],
    paddingHorizontal: spacing[4],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    marginBottom: spacing[2],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    lineHeight: 23,
    marginBottom: spacing[6],
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
    padding: spacing[3],
  },
  biometricText: { fontSize: typography.sizes.md, fontWeight: '700' },
  accountRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  accountHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: { flex: 1, fontSize: typography.sizes.md, fontWeight: '700' },
  balanceInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  warGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  warChip: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
  },
  warLabel: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    textAlign: 'center',
  },
  customWar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    minHeight: 54,
  },
  customInput: { flex: 1, fontSize: typography.sizes.md, fontWeight: '600' },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    width: '100%',
    marginTop: spacing[4],
  },
  notifLabel: { flex: 1, fontSize: typography.sizes.md, fontWeight: '700' },
});
