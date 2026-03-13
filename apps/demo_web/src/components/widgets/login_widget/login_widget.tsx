import { type FC, useState } from "react";

import { Widget } from "../widget_components";
import { LoginDefaultView } from "./login_default_view";
import { LoginSocialsView } from "./login_socials_view";
import styles from "./login_widget.module.scss";
import type { LoginMethod } from "@oko-wallet-demo-web/types/login";

export interface LoginWidgetProps {
  onSignIn: (method: LoginMethod) => void;
}

export const LoginWidget: FC<LoginWidgetProps> = ({ onSignIn }) => {
  const [showSocials, setShowSocials] = useState(false);

  return (
    <Widget>
      <div className={showSocials ? styles.socialsContainer : styles.container}>
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
    </Widget>
  );
};
