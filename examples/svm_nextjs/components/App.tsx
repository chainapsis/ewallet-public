"use client";

import useOkoSvm from "@/hooks/useOkoSvm";
import ConnectedView from "./ConnectedView";
import LoginView from "./LoginView";

export default function App() {
  const { isSignedIn } = useOkoSvm();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {!isSignedIn ? <LoginView /> : <ConnectedView />}
    </div>
  );
}
