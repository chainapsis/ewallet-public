const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Singleton packages — resolve to actual location (may be hoisted to monorepo root)
function resolveModule(name) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

const reactDir = resolveModule("react");
const singletons = {
  react: reactDir,
  "react-native": resolveModule("react-native"),
  "react-dom": resolveModule("react-dom"),
  "react/jsx-runtime": path.resolve(reactDir, "jsx-runtime"),
  "react/jsx-dev-runtime": path.resolve(reactDir, "jsx-dev-runtime"),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If the requested module is a singleton, force it to the sandbox copy
  if (singletons[moduleName]) {
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      singletons[moduleName],
      platform,
    );
  }
  // For modules starting with "react/" or "react-native/", redirect to actual location
  if (moduleName.startsWith("react/")) {
    const subpath = moduleName.slice("react/".length);
    const redirected = path.resolve(reactDir, subpath);
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      redirected,
      platform,
    );
  }
  if (moduleName.startsWith("react-native/")) {
    const subpath = moduleName.slice("react-native/".length);
    const redirected = path.resolve(singletons["react-native"], subpath);
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      redirected,
      platform,
    );
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(
    { ...context, resolveRequest: undefined },
    moduleName,
    platform,
  );
};

module.exports = config;
