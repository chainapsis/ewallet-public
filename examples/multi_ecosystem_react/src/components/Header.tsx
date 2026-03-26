import { useOko } from "@oko-wallet/oko-sdk-react";

function Header() {
  const { isReady, isSignedIn, openSignInModal, signOut } = useOko();

  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Oko" className="w-24 h-10" />
        <h1 className="text-3xl font-bold">Oko Multi‑Ecosystem</h1>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openSignInModal}
          disabled={!isReady || isSignedIn}
        >
          Sign In
        </button>
        <button type="button" onClick={signOut} disabled={!isSignedIn}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Header;
