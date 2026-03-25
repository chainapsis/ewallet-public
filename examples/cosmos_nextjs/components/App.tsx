"use client";

import { useOko } from "@oko-wallet/oko-sdk-react";

import ConnectedView from "./ConnectedView";
import LoginView from "./LoginView";

export default function App() {
  const { isSignedIn } = useOko();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {!isSignedIn ? <LoginView /> : <ConnectedView />}
    </div>
  );
}
