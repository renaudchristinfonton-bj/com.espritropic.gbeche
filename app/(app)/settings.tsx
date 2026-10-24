/**
 * GBECHE — Réglages.
 * Profil, apparence, langue, sécurité (changement de PIN), réinitialisation.
 * Les fonctions Phase 2 sont affichées en état « Bientôt » (jamais de bouton factice).
 */

import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from '@/src/services/haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { Button } from '@/src/components/ui/Button';
import { Sheet } from '@/src/components/ui/Sheet';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { PinPad } from '@/src/components/ui/PinPad';
import { useTheme, type ThemeMode } from '@/src/theme/ThemeContext';
import { useTranslation, type Language } from '@/src/i18n';
import { getSetting, loadSettingsCache, SETTING_KEYS } from '@/src/db/settings';
import { resetDatabase } from '@/src/db/client';
import {
  clearPin,
  getBiometricAvailability,
  hasPin,
  setPin,
  verifyPin,
  wipeAllSecrets,
} from '@/src/services/security';
import { seedDefaults } from '@/src/services/seed';
import { radius, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors } = theme;
  const { language, setLanguage } = useTranslation();
  const router = useRouter();

  const [pinSheet, setPinSheet] = useState(false);
  const [pinStage, setPinStage] = useState<'verify' | 'new' | 'confirm'>('verify');
  const [pinValue, setPinValue] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    // Sur web (et sur tout appareil sans capteur), la biométrie n'existe pas :
    // on masque la ligne plutôt que de proposer une option sans effet.
    getBiometricAvailability().then((availability) => {
      setBiometricSupported(availability.available);
    });
  }, []);

  const warriorName = getSetting(SETTING_KEYS.warriorName) ?? 'Guerrier';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openPinSheet = async () => {
    await getBiometricAvailability();
    const configured = await hasPin();
    setPinStage(configured ? 'verify' : 'new');
    setPinValue('');
    setNewPin('');
    setPinError(false);
    setPinSheet(true);
  };

  const handlePinFull = async (value: string) => {
    if (pinStage === 'verify') {
      const ok = await verifyPin(value);
      if (!ok) {
        setPinError(true);
        setPinValue('');
        setTimeout(() => setPinError(false), 600);
        return;
      }
      setPinStage('new');
      setPinValue('');
      return;
    }
    if (pinStage === 'new') {
      setNewPin(value);
      setPinStage('confirm');
      setPinValue('');
      return;
    }
    if (value !== newPin) {
      setPinError(true);
      setPinValue('');
      setTimeout(() => setPinError(false), 600);
      return;
    }
    await setPin(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPinSheet(false);
  };

  const confirmReset = () => {
    Alert.alert(
      'Tout effacer',
      'Toutes tes données locales (guerres, finances, progression) seront supprimées définitivement. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            await wipeAllSecrets();
            await resetDatabase();
            await clearPin();
            await loadSettingsCache();
            await seedDefaults();
            router.replace('/(onboarding)');
          },
        },
      ],
    );
  };

  return (
    <Screen scroll padded>
      <Text style={[styles.title, { color: colors.text }]}>Réglages</Text>

      {/* Profil */}
      <Text style={[styles.section, { color: colors.textMuted }]}>Profil</Text>
      <GlassCard style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Nom de guerre</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>{warriorName}</Text>
        </View>
      </GlassCard>

      {/* Apparence */}
      <Text style={[styles.section, { color: colors.textMuted }]}>Apparence</Text>
      <GlassCard style={{ gap: spacing[3] }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Thème</Text>
        <SegmentedControl<ThemeMode>
          segments={[
            { value: 'dark', label: 'Sombre' },
            { value: 'light', label: 'Clair' },
            { value: 'system', label: 'Auto' },
          ]}
          value={themeMode}
          onChange={setThemeMode}
        />
        <Text style={[styles.rowLabel, { color: colors.text, marginTop: spacing[2] }]}>Langue</Text>
        <SegmentedControl<Language>
          segments={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </GlassCard>

      {/* Sécurité */}
      <Text style={[styles.section, { color: colors.textMuted }]}>Sécurité & vie privée</Text>
      <GlassCard style={{ gap: spacing[2] }}>
        <SettingsRow
          icon="keypad"
          color={colors.primary}
          label="Code PIN"
          value="Modifié"
          onPress={openPinSheet}
        />
        {biometricSupported ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <SettingsRow
              icon="finger-print"
              color={colors.success}
              label="Biométrie"
              value={
                getSetting(SETTING_KEYS.biometricEnabled) === '1'
                  ? 'Activée'
                  : 'Disponible à la configuration'
              }
              onPress={openPinSheet}
            />
          </>
        ) : null}
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <SettingsRow
          icon="shield-checkmark-outline"
          color={colors.xp}
          label="Stockage des données"
          value="100 % sur cet appareil"
        />
      </GlassCard>

      {/* Phase 2 */}
      <Text style={[styles.section, { color: colors.textMuted }]}>Bientôt</Text>
      <GlassCard style={{ gap: spacing[2] }}>
        <SoonRow icon="calendar" label="Calendrier & suivi horaire" />
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <SoonRow icon="chatbubbles" label="Agent conversationnel local" />
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <SoonRow icon="download" label="Export / import CSV" />
      </GlassCard>

      {/* Zone dangereuse */}
      <Text style={[styles.section, { color: colors.textMuted }]}>Données</Text>
      <Button label="Réinitialiser l'application" variant="danger" fullWidth onPress={confirmReset} />

      <Text style={[styles.version, { color: colors.textTertiary }]}>
        GBECHE v{version} · Hors-ligne · Aucun serveur
      </Text>

      {/* Sheet PIN */}
      <Sheet
        visible={pinSheet}
        title={pinStage === 'verify' ? 'PIN actuel' : pinStage === 'new' ? 'Nouveau PIN' : 'Confirme le PIN'}
        onClose={() => setPinSheet(false)}
      >
        <PinPad value={pinValue} onChange={setPinValue} onFull={handlePinFull} error={pinError} />
      </Sheet>
    </Screen>
  );
}

function SettingsRow({
  icon,
  color,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme().theme;
  const content = (
    <View style={styles.settingRow}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function SoonRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme().theme;
  return (
    <View style={styles.settingRow}>
      <View style={[styles.rowIcon, { backgroundColor: colors.glass }]}>
        <Ionicons name={icon} size={20} color={colors.textTertiary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textMuted, flex: 1 }]}>{label}</Text>
      <View style={styles.soonBadge}>
        <Text style={[styles.soonText, { color: colors.textMuted }]}>Phase 2</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.sizes['3xl'], fontWeight: '800', letterSpacing: -0.5, marginBottom: spacing[5] },
  section: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing[5],
    marginBottom: spacing[2.5],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  rowIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: typography.sizes.md, fontWeight: '700' },
  rowValue: { fontSize: typography.sizes.sm, fontWeight: '600' },
  divider: { height: 1, width: '100%' },
  soonBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  soonText: { fontSize: typography.sizes.xs, fontWeight: '800', letterSpacing: 0.4 },
  version: {
    textAlign: 'center',
    marginTop: spacing[8],
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
