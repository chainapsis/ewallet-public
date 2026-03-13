"use client";

import { useAccount } from "wagmi";

import ConnectedView from "./ConnectedView";
import LoginView from "./LoginView";

export default function App() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {!isConnected ? <LoginView /> : <ConnectedView />}
    </div>
  );
}
