/**
 * Avertissement affiché sur web quand le stockage persistant (OPFS) n'est
 * pas supporté par le navigateur. Rappelle d'exporter une sauvegarde et
 * de privilégier Safari 18+ ou un navigateur Chromium récent.
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import { isPersistentStorageSupported } from '../../services/data/storageSupport';

export function StorageWarning() {
  const { colors } = useTheme().theme;
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (Platform.OS !== 'web' || dismissed || isPersistentStorageSupported()) {
    return null;
  }

  return (
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.container}>
      <View style={[styles.banner, { backgroundColor: colors.backgroundElevated, borderColor: colors.warning }]}>
        <Ionicons name="warning" size={22} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Stockage non persistant</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Ce navigateur ne garantit pas la conservation des données. Utilise Safari 18+ ou Chrome,
            et exporte une sauvegarde JSON.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/data')}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.link, { color: colors.primary }]}>Ouvrir Import / Export</Text>
          </Pressable>
        </View>
        <Pressable hitSlop={10} onPress={() => setDismissed(true)}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing[3], zIndex: 300 },
  banner: {
    flexDirection: 'row',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    alignItems: 'flex-start',
  },
  title: { fontSize: typography.sizes.md, fontWeight: '800' },
  body: { fontSize: typography.sizes.sm, marginTop: 3, lineHeight: 18 },
  link: { fontSize: typography.sizes.sm, fontWeight: '800', marginTop: 6 },
});
