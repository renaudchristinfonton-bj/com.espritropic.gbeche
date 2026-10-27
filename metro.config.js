const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite sur web charge un moteur SQLite compilé en WebAssembly
// (wa-sqlite.wasm) : Metro doit traiter .wasm comme un asset à copier.
config.resolver.assetExts = [...config.resolver.assetExts.filter((ext) => ext !== 'wasm'), 'wasm'];

// Le VFS persistant d'expo-sqlite web (OPFS, createSyncAccessHandle dans un
// worker) exige un contexte cross-origin isolé. On injecte COOP/COEP sur
// toutes les réponses du serveur de dev pour que `npx expo start --web`
// fonctionne en local. En production, les mêmes en-têtes sont posés par
// netlify.toml (sans effet sur les builds natifs EAS).
config.server = config.server ?? {};
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, server)
    : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return enhanced(req, res, next);
  };
};

module.exports = config;
