"use client";

import { useState } from "react";

import { postLoginAdmin, postLogoutAdmin } from "@oko-wallet-admin/fetch/admin";
import { useAppState } from "@oko-wallet-admin/state";

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { token, setUserState, resetUserState } = useAppState();

  async function login(email: string, password: string): Promise<boolean> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await postLoginAdmin(email, password);
      if (!response.success) {
        setError(new Error(response.msg));
        return false;
      }

      const data = response.data;
      setUserState(
        {
          user_id: data.admin.user_id,
          role: data.admin.role,
          email,
        },
        data.token,
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred."),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    if (!token) {
      return;
    }

    postLogoutAdmin(token);
    resetUserState();
  }

  return {
    login,
    logout,
    isLoading,
    error,
    // user, token, isHydrated
  };
}
