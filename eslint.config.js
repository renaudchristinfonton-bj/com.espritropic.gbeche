// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '/tmp/*'],
    rules: {
      // Le français utilise couramment l'apostrophe dans les textes UI.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
