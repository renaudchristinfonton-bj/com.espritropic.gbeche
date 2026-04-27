/**
 * GBECHE — Settings Screen
 * Thème dark/light, langue, notifications, biométrie, sécurité, export.
 */

import React, { useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useTheme } from '@/src/theme/ThemeContext';
import { useTranslation } from '@/src/i18n/I18nProvider';
import { GlassCard } from '@/src/components/ui/GlassCard';
import {
  getNotifPreferences,
  saveNotifPreferences,
  cancelAll,
  initNotifications,
} from '@/src/services/notifications';
import { clearAllSecrets } from '@/src/services/crypto';
import { ProgressRing } from '@/src/components/ui/XPBar';

// ─── Row components ───────────────────────────────────────

interface RowProps {
  icon:     keyof typeof Ionicons.glyphMap;
  color:    string;
  label:    string;
  sub?:     string;
  right?:   React.ReactNode;
  onPress?: () => void;
  danger?:  boolean;
}

function Row({ icon, color, label, sub, right, onPress, danger }: RowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.colors.glassBorder },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={danger ? '#FF4757' : color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? '#FF4757' : theme.colors.text }]}>
          {label}
        </Text>
        {sub && <Text style={[styles.rowSub, { color: theme.colors.textMuted }]}>{sub}</Text>}
      </View>
      {right ?? (onPress && (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      ))}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>
      {title.toUpperCase()}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { colors } = theme;
  const router = useRouter();

  // Notifications prefs
  const [notifPrefs, setNotifPrefs] = useState(getNotifPreferences);

  const toggleNotif = useCallback((key: keyof typeof notifPrefs) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    saveNotifPreferences(next);
    // Reschedule
    cancelAll().then(() => initNotifications());
  }, [notifPrefs]);

  // Theme
  const handleTheme = (mode: 'dark' | 'light' | 'system') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(mode);
  };

  // Language
  const handleLang = (lang: 'fr' | 'en') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(lang);
  };

  // Danger zone
  const handleDeleteData = () => {
    Alert.alert(
      'Supprimer toutes les données',
      'Cette action est irréversible. Toutes tes Guerres, tâches et données financières seront effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            clearAllSecrets();
            // TODO: clear WatermelonDB
            router.replace('/(onboarding)/');
          },
        },
      ]
    );
  };

  const ACCENT = '#00E5FF';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(0,229,255,0.06)', 'transparent']}
        style={styles.headerGrad}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Paramètres</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          GBECHE v1.0 · Guerrier Niveau 12
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Appearance ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <SectionHeader title="Apparence" />
          <GlassCard noPadding>
            {/* Theme */}
            <View style={styles.themeRow}>
              {[
                { id: 'dark',   icon: 'moon',      label: 'Sombre' },
                { id: 'light',  icon: 'sunny',     label: 'Clair'  },
                { id: 'system', icon: 'phone-portrait', label: 'Auto' },
              ].map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => handleTheme(opt.id as any)}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: themeMode === opt.id ? ACCENT + '22' : 'transparent',
                      borderColor:     themeMode === opt.id ? ACCENT : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={20}
                    color={themeMode === opt.id ? ACCENT : colors.textMuted}
                  />
                  <Text style={[
                    styles.themeBtnLabel,
                    { color: themeMode === opt.id ? ACCENT : colors.textMuted },
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Language ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <SectionHeader title="Langue" />
          <GlassCard noPadding>
            <Row
              icon="flag"
              color="#00FF88"
              label="Français"
              right={
                <Pressable onPress={() => handleLang('fr')} style={styles.langBtn}>
                  {language === 'fr'
                    ? <Ionicons name="radio-button-on" size={22} color="#00FF88" />
                    : <Ionicons name="radio-button-off" size={22} color="#555" />
                  }
                </Pressable>
              }
            />
            <Row
              icon="flag-outline"
              color="#00E5FF"
              label="English"
              right={
                <Pressable onPress={() => handleLang('en')} style={styles.langBtn}>
                  {language === 'en'
                    ? <Ionicons name="radio-button-on" size={22} color="#00E5FF" />
                    : <Ionicons name="radio-button-off" size={22} color="#555" />
                  }
                </Pressable>
              }
            />
          </GlassCard>
        </Animated.View>

        {/* ── Notifications ────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <SectionHeader title="Notifications" />
          <GlassCard noPadding>
            {([
              { key: 'morning',   icon: 'sunny',           color: '#FFD700', label: 'Réveil du Guerrier',     sub: '6h30 chaque matin' },
              { key: 'noon',      icon: 'partly-sunny',    color: '#FF9F43', label: 'Mi-journée',             sub: '12h00 · bilan rapide' },
              { key: 'evening',   icon: 'moon',            color: '#A78BFA', label: 'Bilan du soir',          sub: '21h00 · compte-rendu' },
              { key: 'streak',    icon: 'flame',           color: '#FF6B35', label: 'Alerte Streak',          sub: '23h00 si non validé' },
              { key: 'boss',      icon: 'skull',           color: '#FF4757', label: 'Boss hebdomadaire',      sub: 'Dimanche 20h00' },
              { key: 'hourly',    icon: 'time',            color: '#00E5FF', label: 'Suivi horaire',          sub: '9h → 21h chaque heure' },
            ] as const).map((n) => (
              <Row
                key={n.key}
                icon={n.icon}
                color={n.color}
                label={n.label}
                sub={n.sub}
                right={
                  <Switch
                    value={notifPrefs[n.key]}
                    onValueChange={() => toggleNotif(n.key)}
                    trackColor={{ false: '#333', true: n.color + '88' }}
                    thumbColor={notifPrefs[n.key] ? n.color : '#888'}
                  />
                }
              />
            ))}
          </GlassCard>
        </Animated.View>

        {/* ── Security ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(180).duration(400)}>
          <SectionHeader title="Sécurité" />
          <GlassCard noPadding>
            <Row
              icon="finger-print"
              color="#00FF88"
              label="Biométrie"
              sub="FaceID / Empreinte digitale"
              right={<Switch trackColor={{ false: '#333', true: '#00FF8888' }} thumbColor="#00FF88" value />}
            />
            <Row
              icon="keypad"
              color="#00E5FF"
              label="Changer le PIN"
              onPress={() => router.push('/(auth)/pin')}
            />
            <Row
              icon="lock-closed"
              color="#A78BFA"
              label="Chiffrement des données"
              sub="AES-256 · Stockage local uniquement"
            />
          </GlassCard>
        </Animated.View>

        {/* ── Data ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <SectionHeader title="Données" />
          <GlassCard noPadding>
            <Row
              icon="download"
              color="#00E5FF"
              label="Exporter mes données"
              sub="JSON · Toutes les guerres et transactions"
              onPress={() => Alert.alert('Export', 'Fonctionnalité bientôt disponible.')}
            />
            <Row
              icon="cloud-upload"
              color="#A78BFA"
              label="Sauvegarde chiffrée"
              sub="Via fichier local · Aucun cloud"
              onPress={() => Alert.alert('Backup', 'Fonctionnalité bientôt disponible.')}
            />
          </GlassCard>
        </Animated.View>

        {/* ── About ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <SectionHeader title="À propos" />
          <GlassCard noPadding>
            <Row icon="information-circle" color="#888" label="Version" sub="GBECHE v1.0.0-beta" />
            <Row icon="shield-checkmark"   color="#888" label="Confidentialité" sub="100% hors-ligne · aucune donnée envoyée" />
            <Row icon="code-slash"         color="#888" label="Open Source"  sub="github.com/gbeche/app" onPress={() => {}} />
          </GlassCard>
        </Animated.View>

        {/* ── Danger Zone ──────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(360).duration(400)}>
          <SectionHeader title="Zone dangereuse" />
          <GlassCard noPadding style={{ borderColor: '#FF475722' }}>
            <Row
              icon="trash"
              color="#FF4757"
              label="Effacer toutes les données"
              sub="Action irréversible"
              onPress={handleDeleteData}
              danger
            />
          </GlassCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1 },
  headerGrad:   { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle:  { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  headerSub:    { fontSize: 12, fontWeight: '600', marginTop: 4, letterSpacing: 0.3 },
  content:      { padding: 16, gap: 6 },

  sectionHeader: {
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 2,
    marginTop:     16,
    marginBottom:  6,
    marginLeft:    4,
  },

  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  13,
    paddingHorizontal: 16,
    gap:              12,
    borderBottomWidth: 1,
  },
  rowIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub:   { fontSize: 11, marginTop: 2, fontWeight: '500' },

  // Theme selector
  themeRow: {
    flexDirection:  'row',
    padding:        12,
    gap:            8,
  },
  themeBtn: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 12,
    borderRadius:   12,
    borderWidth:    1,
    gap:            6,
  },
  themeBtnLabel: {
    fontSize:   11,
    fontWeight: '700',
  },

  langBtn: { padding: 4 },
});
