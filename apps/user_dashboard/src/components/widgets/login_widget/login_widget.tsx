import type { AuthType } from "@oko-wallet/oko-types/auth";
import { type FC, useState } from "react";

import { LoginDefaultView } from "./login_default_view";
import { LoginSocialsView } from "./login_socials_view";
import styles from "./login_widget.module.scss";

export interface LoginWidgetProps {
  onSignIn: (method: AuthType) => void;
}

export const LoginWidget: FC<LoginWidgetProps> = ({ onSignIn }) => {
  const [showSocials, setShowSocials] = useState(false);

  return (
    <div className={styles.container}>
      {!showSocials ? (
        <LoginDefaultView
          onSignIn={onSignIn}
          onShowSocials={() => setShowSocials(true)}
        />
      ) : (
        <LoginSocialsView
          onBack={() => setShowSocials(false)}
          onSignIn={(m) => onSignIn(m)}
        />
      )}
    </div>
  );
};
