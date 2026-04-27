const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

let config = getDefaultConfig(__dirname);

// ─── SVG transformer ──────────────────────────────────────
// Lets react-native-svg handle .svg files instead of treating them as assets
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

// ─── NativeWind v4 ────────────────────────────────────────
config = withNativeWind(config, { input: './global.css' });

module.exports = config;
