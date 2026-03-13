"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Checkbox } from "@oko-wallet/oko-common-ui/checkbox";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./login_form.module.scss";
import { useLogin } from "./use_login";
import { useToast } from "@oko-wallet-admin/components/toast/use_toast";
import { paths } from "@oko-wallet-admin/paths";

const REMEMBERED_EMAIL_KEY = "oko_admin_remembered_email";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const { login, isLoading, error } = useLogin();
  const router = useRouter();
  const { showErrorToast } = useToast();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const isSuccess = await login(email, password);
      if (isSuccess) {
        if (remember) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        router.push(paths.apps);
      }
    } catch (_err) {}
  };

  useEffect(() => {
    if (error) {
      showErrorToast(error.message);
    }
  }, [error]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Email"
        id="email"
        type="text"
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
        required
        placeholder="Email"
        fullWidth
      />
      <Input
        label="Password"
        id="password"
        type="password"
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
        required
        placeholder="Password"
        fullWidth
      />

      <Checkbox
        id="remember_me"
        checked={remember}
        onChange={setRemember}
        label="Remember me"
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        disabled={isLoading || !email || !password}
      >
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
};
