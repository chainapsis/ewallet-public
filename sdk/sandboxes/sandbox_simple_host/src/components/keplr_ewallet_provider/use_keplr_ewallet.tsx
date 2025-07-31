"use client";

import { useAppState } from "@/state";

export type LoginMethod = "email" | "sms" | "google" | "apple" | "twitter";

export const ALL_LOGIN_METHODS: LoginMethod[] = [
  "email",
  "sms",
  "google",
  "apple",
  "twitter",
];

export const useKeplrEwallet = () => {
  const cosmosEWallet = useAppState((state) => state.keplr_sdk_cosmos);
  const ethEWallet = useAppState((state) => state.keplr_sdk_eth);

  return {
    cosmosEWallet,
    ethEWallet,
  };
};
