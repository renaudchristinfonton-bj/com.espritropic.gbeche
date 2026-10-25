/**
 * GBECHE — Écran Données : import / export.
 * - Modèle CSV de planification (généré ou rempli par une IA)
 * - Import CSV : guerres, batailles, adversaires, fréquences, dépenses
 * - Export CSV de l'existant
 * - Sauvegarde / restauration JSON complète (sécurité anti-perte)
 * Tout reste local : aucun envoi réseau.
 */
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from '@/src/services/haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { Button } from '@/src/components/ui/Button';
import { useTheme } from '@/src/theme/ThemeContext';
import { radius, spacing, typography } from '@/src/theme';
import { pickTextFile, saveTextFile } from '@/src/services/data/fileStore';
import {
  exportBackup,
  exportCsv,
  importBackup,
  importCsv,
  type BackupFile,
  type CsvImportReport,
} from '@/src/services/data/importExport.service';
import { CSV_TEMPLATE, CSV_TEMPLATE_FILENAME } from '@/src/services/data/csv-template';

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DataScreen() {
  const { colors } = useTheme().theme;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<CsvImportReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await task();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[data]', error);
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = () =>
    run('template', async () => {
      await saveTextFile(CSV_TEMPLATE_FILENAME, CSV_TEMPLATE, 'text/csv');
      setMessage('Modèle CSV téléchargé.');
    });

  const exportCsvFile = () =>
    run('export-csv', async () => {
      const csv = await exportCsv();
      await saveTextFile(`gbeche-export-${timestamp()}.csv`, csv, 'text/csv');
      setMessage('Export CSV généré.');
    });

  const importCsvFile = () =>
    run('import-csv', async () => {
      const picked = await pickTextFile(['text/csv', 'text/plain', 'text/comma-separated-values']);
      if (!picked) return;
      const result = await importCsv(picked.content);
      setReport(result);
      setMessage(
        result.errors.length === 0
          ? 'Import CSV terminé sans erreur.'
          : `Import terminé avec ${result.errors.length} remarque(s).`,
      );
    });

  const exportJsonFile = () =>
    run('export-json', async () => {
      const backup = await exportBackup();
      await saveTextFile(
        `gbeche-sauvegarde-${timestamp()}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
      setMessage('Sauvegarde JSON générée.');
    });

  const importJsonFile = () =>
    run('import-json', async () => {
      const picked = await pickTextFile(['application/json', 'text/plain']);
      if (!picked) return;
      const parsed = JSON.parse(picked.content) as BackupFile;
      await importBackup(parsed);
      setMessage('Sauvegarde restaurée. Redirection…');
      setTimeout(() => router.replace('/(app)/home'), 800);
    });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Données & fichiers</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Importe un programme sur mesure préparé dans le modèle CSV, ou sauvegarde tout ton
          quartier général. Rien ne quitte cet appareil.
        </Text>
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Programme CSV</Text>
      <GlassCard style={styles.card}>
        <FeatureRow
          icon="document-attach"
          color={colors.primary}
          title="Modèle CSV à remplir"
          description="Guerres, batailles, adversaires, fréquences et dépenses : un fichier exemple prêt à compléter ou à confier à une IA."
        />
        <Button label="Télécharger le modèle" variant="glass" fullWidth onPress={downloadTemplate} loading={busy === 'template'} />
        <View style={styles.gap} />
        <Button label="Importer un programme CSV" fullWidth onPress={importCsvFile} loading={busy === 'import-csv'} />
        <View style={styles.gap} />
        <Button label="Exporter mes données en CSV" variant="glass" fullWidth onPress={exportCsvFile} loading={busy === 'export-csv'} />
      </GlassCard>

      {report ? (
        <GlassCard style={styles.card}>
          <Text style={[styles.reportTitle, { color: colors.success }]}>Bilan du dernier import</Text>
          <ReportLine label="Guerres créées" value={report.wars} />
          <ReportLine label="Batailles créées" value={report.battles} />
          <ReportLine label="Routines récurrentes" value={report.templates} />
          <ReportLine label="Missions ponctuelles" value={report.manualAdversaries} />
          <ReportLine label="Comptes créés" value={report.accounts} />
          <ReportLine label="Mouvements financiers" value={report.transactions} />
          {report.skipped > 0 ? <ReportLine label="Lignes ignorées" value={report.skipped} /> : null}
          {report.errors.map((error) => (
            <Text key={error} style={[styles.errorLine, { color: colors.danger }]}>
              • {error}
            </Text>
          ))}
        </GlassCard>
      ) : null}

      <Text style={[styles.section, { color: colors.textMuted }]}>Sauvegarde complète</Text>
      <GlassCard style={styles.card}>
        <FeatureRow
          icon="save"
          color={colors.xp}
          title="Sauvegarde JSON"
          description="Image complète de la base et du code PIN, utile pour changer d'appareil ou de navigateur sans rien perdre."
        />
        <Button label="Exporter la sauvegarde" variant="glass" fullWidth onPress={exportJsonFile} loading={busy === 'export-json'} />
        <View style={styles.gap} />
        <Button label="Restaurer une sauvegarde" variant="danger" fullWidth onPress={importJsonFile} loading={busy === 'import-json'} />
      </GlassCard>

      <Text style={[styles.section, { color: colors.textMuted }]}>Stockage local</Text>
      <GlassCard style={styles.card}>
        <FeatureRow
          icon={Platform.OS === 'web' ? 'cloud-done' : 'phone-portrait'}
          color={colors.success}
          title={Platform.OS === 'web' ? 'Stocké dans ce navigateur' : 'Stocké sur cet appareil'}
          description={
            Platform.OS === 'web'
              ? 'Base SQLite (OPFS) et préférences dans le stockage local du navigateur. Sur iOS, utilise Safari 18+ et ne vide pas les données du site.'
              : 'Base SQLite locale et secrets dans le coffre matériel. Aucun serveur, aucune synchronisation.'
          }
        />
      </GlassCard>

      {message ? (
        <Text style={[styles.message, { color: colors.primary }]}>{message}</Text>
      ) : null}
    </Screen>
  );
}

function FeatureRow({
  icon,
  color,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
}) {
  const { colors } = useTheme().theme;
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureBody, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </View>
  );
}

function ReportLine({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme().theme;
  return (
    <View style={styles.reportLine}>
      <Text style={[styles.reportLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.reportValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing[4] },
  title: { fontSize: typography.sizes['3xl'], fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: typography.sizes.md, marginTop: 6, lineHeight: 22 },
  section: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing[5],
    marginBottom: spacing[2.5],
  },
  card: { gap: spacing[2], padding: spacing[4] },
  gap: { height: spacing[2] },
  feature: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: typography.sizes.md, fontWeight: '800' },
  featureBody: { fontSize: typography.sizes.sm, marginTop: 3, lineHeight: 19 },
  reportTitle: { fontSize: typography.sizes.md, fontWeight: '800', marginBottom: spacing[2] },
  reportLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reportLabel: { fontSize: typography.sizes.base, fontWeight: '600' },
  reportValue: { fontSize: typography.sizes.base, fontWeight: '800' },
  errorLine: { fontSize: typography.sizes.sm, marginTop: 4, fontWeight: '600' },
  message: {
    textAlign: 'center',
    fontSize: typography.sizes.base,
    fontWeight: '700',
    marginTop: spacing[5],
  },
});
