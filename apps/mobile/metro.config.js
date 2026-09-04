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

// Force "react" to always resolve from the local workspace copy — SDK 57 pins
// react@19.2.3 where the web app floats on ^19.0.0 and currently installs
// 19.2.8, so the two still diverge and the renderer still has to match.
// extraNodeModules is only a fallback and loses to standard node_modules walk,
// so we use resolveRequest to intercept at the highest priority.
// Don't delete this because the numbers happen to agree after an install: web
// floats, so they will disagree again on its next one.
const localReact = path.resolve(projectRoot, 'node_modules/react');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return { filePath: `${localReact}/index.js`, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
