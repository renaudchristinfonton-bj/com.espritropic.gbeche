const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite sur web charge un moteur SQLite compilé en WebAssembly
// (wa-sqlite.wasm) : Metro doit traiter .wasm comme un asset à copier.
config.resolver.assetExts = [...config.resolver.assetExts.filter((ext) => ext !== 'wasm'), 'wasm'];

module.exports = config;
