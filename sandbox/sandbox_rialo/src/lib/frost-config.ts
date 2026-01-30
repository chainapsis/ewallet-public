import { createConfig, getDefaultRialoClientConfig } from "@rialo/frost";

export const frostConfig = createConfig({
  clientConfig: getDefaultRialoClientConfig("devnet"),
  autoConnect: true,
});
