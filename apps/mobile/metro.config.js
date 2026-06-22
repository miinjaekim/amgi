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

// Force singleton packages to always resolve from the local workspace.
// Without this, packages that live at root (e.g. react-native) resolve
// their own imports of "react" from root node_modules (react@19.2.7),
// which mismatches the react-native-renderer version bundled with
// react-native@0.81.5 (expects react@19.1.0).
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
};

module.exports = config;
