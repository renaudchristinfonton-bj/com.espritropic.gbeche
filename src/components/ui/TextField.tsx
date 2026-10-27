/**
 * GBECHE — Champ de saisie thématé.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  suffix?: string;
}

export function TextField({ label, icon, error, suffix, style, ...rest }: TextFieldProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.glass,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.glassBorder,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textMuted}
            style={{ marginRight: spacing[2] }}
          />
        ) : null}
        <TextInput
          placeholderTextColor={colors.textTertiary}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={[
            styles.input,
            { color: colors.text, fontSize: typography.sizes.md },
            style,
          ]}
        />
        {suffix ? (
          <Text style={[styles.suffix, { color: colors.textMuted }]}>{suffix}</Text>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: spacing[4] },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontWeight: '500',
  },
  suffix: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    marginLeft: spacing[2],
  },
  error: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
