import styles from "./page.module.scss";
import { LoginForm } from "@oko-wallet-admin/components/login/login_form";
import { LoginHeader } from "@oko-wallet-admin/components/login/login_header";

const SignInPage = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <LoginHeader />
        <LoginForm />
      </div>
    </div>
  );
};

export default SignInPage;
