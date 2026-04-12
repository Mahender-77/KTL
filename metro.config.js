const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ensure resolution from this app's node_modules (fixes scoped packages like @expo/vector-icons
// when Metro's default nodeModulesPaths is empty or workspace layout confuses the resolver).
const localNodeModules = path.resolve(projectRoot, "node_modules");
config.resolver.nodeModulesPaths = [
  localNodeModules,
  ...(Array.isArray(config.resolver.nodeModulesPaths)
    ? config.resolver.nodeModulesPaths
    : []),
];

module.exports = config;
