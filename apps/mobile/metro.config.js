const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// SANDBOX MODE: Force Metro to ONLY look in the current directory
config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules')
];

config.resolver.disableHierarchicalLookup = true;

// EXPLICIT MAPPING: Brute force resolution for problematic packages
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    'promise': path.resolve(projectRoot, 'node_modules/promise'),
    'react': path.resolve(projectRoot, 'node_modules/react'),
    'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
    '@expo/vector-icons': path.resolve(projectRoot, 'node_modules/@expo/vector-icons'),
};

module.exports = config;
