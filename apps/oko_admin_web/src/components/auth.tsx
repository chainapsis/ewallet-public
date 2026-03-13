"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { paths } from "@oko-wallet-admin/paths";
import { useAppState } from "@oko-wallet-admin/state";

export const Auth = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);

  useEffect(() => {
    const subscribe = useAppState.persist.onFinishHydration(() => {
      setIsStoreHydrated(true);
    });
    setIsStoreHydrated(useAppState.persist.hasHydrated());
    return () => {
      subscribe();
    };
  }, []);

  useEffect(() => {
    if (!isStoreHydrated) {
      return;
    }

    const isLoginPage = pathname === "/login";

    if (!token && !isLoginPage) {
      router.push(paths.sign_in);
      return;
    }

    if (token && isLoginPage) {
      router.push(paths.apps);
      return;
    }
  }, [token, pathname, isStoreHydrated, router]);

  if (!isStoreHydrated) {
    return <div>Loading...</div>;
  }

  if (!token && pathname !== paths.sign_in) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default Auth;
