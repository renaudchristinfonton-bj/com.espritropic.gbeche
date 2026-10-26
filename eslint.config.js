// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactNativeA11y = require('eslint-plugin-react-native-a11y');
const nodeGlobals = require('globals');

module.exports = defineConfig([
  // Bloc d'ignorés global (doit rester un objet ne contenant que `ignores`).
  {
    ignores: ['dist/', 'dist/**', '/tmp/*', 'coverage/**', 'node_modules/**'],
  },
  expoConfig,
  {
    // Audit UX/UI : accessibilité des composants tactiles natifs.
    plugins: {
      'react-native-a11y': reactNativeA11y,
    },
    rules: {
      // Le français utilise couramment l'apostrophe dans les textes UI.
      'react/no-unescaped-entities': 'off',

      // Règles de validité (ne déclenchent que sur des props incorrectes).
      'react-native-a11y/has-valid-accessibility-actions': 'error',
      'react-native-a11y/has-valid-accessibility-component-type': 'error',
      'react-native-a11y/has-valid-accessibility-role': 'error',
      'react-native-a11y/has-valid-accessibility-state': 'error',
      'react-native-a11y/has-valid-accessibility-states': 'error',
      'react-native-a11y/has-valid-accessibility-traits': 'error',
      'react-native-a11y/has-valid-accessibility-value': 'error',
      'react-native-a11y/has-valid-accessibility-live-region': 'error',
      'react-native-a11y/has-valid-important-for-accessibility': 'error',

      // Couverture : signalé en avertissement pour nourrir le rapport
      // d'audit sans bloquer la compilation.
      'react-native-a11y/has-accessibility-props': 'warn',
      'react-native-a11y/has-accessibility-hint': 'off',
      'react-native-a11y/no-nested-touchables': 'warn',
    },
  },
  {
    // Scripts Node de génération/audit (pas de runtime navigateur/RN).
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: nodeGlobals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    // Les factories jest.mock() utilisent légitimement require().
    files: ['jest.setup.ts', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
