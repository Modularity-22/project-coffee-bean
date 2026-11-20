const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the prebuilt SQLite snapshot (assets/data/coffee.db) and, for web,
// the SQLite WebAssembly build.
config.resolver.assetExts.push('db', 'wasm');

// expo-sqlite on web needs cross-origin isolation.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
