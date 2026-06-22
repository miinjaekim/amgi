const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so Metro can resolve @amgi/core
config.watchFolders = [monorepoRoot];

// Check apps/mobile/node_modules first, then root.
// Critical in a monorepo: prevents root node_modules from shadowing
// locally-installed workspace packages with wrong versions.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force "react" to always resolve from the local workspace copy (react@19.1.0).
// extraNodeModules is only a fallback and loses to standard node_modules walk,
// so we use resolveRequest to intercept at the highest priority.
// Without this, react-native (installed at root) resolves "react" to the web
// app's react@19.2.7, which mismatches react-native-renderer@19.1.0.
const localReact = path.resolve(projectRoot, 'node_modules/react');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return { filePath: `${localReact}/index.js`, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
