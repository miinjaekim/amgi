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

module.exports = config;
