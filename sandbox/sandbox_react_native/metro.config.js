const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Singleton packages — always resolve to sandbox's copy
const singletons = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "react/jsx-runtime": path.resolve(
    projectRoot,
    "node_modules/react/jsx-runtime",
  ),
  "react/jsx-dev-runtime": path.resolve(
    projectRoot,
    "node_modules/react/jsx-dev-runtime",
  ),
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
  // For modules starting with "react/" or "react-native/", redirect too
  if (
    moduleName.startsWith("react/") ||
    moduleName.startsWith("react-native/")
  ) {
    const redirected = path.resolve(projectRoot, "node_modules", moduleName);
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
