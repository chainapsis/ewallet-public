"use client";

import {
  initKeplrEwalletCore,
  KeplrEWallet,
} from "@keplr-ewallet/ewallet-sdk-core";
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";

export type LoginMethod = "email" | "sms" | "google" | "apple" | "twitter";

export const ALL_LOGIN_METHODS: LoginMethod[] = [
  "email",
  "sms",
  "google",
  "apple",
  "twitter",
];

interface KeplrEwalletContextType {
  loginMethods: LoginMethod[];
  setLoginMethods: React.Dispatch<React.SetStateAction<LoginMethod[]>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  eWallet: KeplrEWallet | null;
  isInitialized: boolean;
}

interface KeplrEwalletProviderProps {
  children: ReactNode;
  initialLoginMethods?: LoginMethod[];
}

const KeplrEwalletContext = createContext<KeplrEwalletContextType | undefined>(
  undefined,
);

export const KeplrEwalletProvider = ({
  children,
  initialLoginMethods,
}: KeplrEwalletProviderProps) => {
  const [loginMethods, setLoginMethods] = useState<LoginMethod[]>(
    initialLoginMethods || ["email", "google"],
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [eWallet, setEWallet] = useState<KeplrEWallet | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initKeplrEwalletCore({
      customer_id: "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
    }).then((result) => {
      if (result.success) {
        setEWallet(result.data);
        setIsInitialized(true);
      } else {
        console.error(result.err);
        setIsInitialized(false);
      }
    });
  }, []);

  return (
    <KeplrEwalletContext.Provider
      value={{
        loginMethods,
        setLoginMethods,
        isAuthenticated,
        setIsAuthenticated,
        eWallet,
        isInitialized,
      }}
    >
      {children}
    </KeplrEwalletContext.Provider>
  );
};

export const useKeplrEwallet = () => {
  const context = useContext(KeplrEwalletContext);
  if (context === undefined) {
    throw new Error(
      "useKeplrEwallet must be used within a KeplrEwalletProvider",
    );
  }
  return context;
};
