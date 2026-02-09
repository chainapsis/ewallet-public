import { type FunctionComponent as FC } from "preact";

import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";
import type { ResolvedTheme } from "../types";
import { S3_LOGO_URL, S3_LOGO_WITH_NAME_URL } from "../icons";
import { ProviderButton } from "./provider_button";
import {
  EmailIcon,
  GoogleIcon,
  XSmallIcon,
  TelegramSmallIcon,
  AppleSmallIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "./icons";

export interface DefaultViewProps {
  theme: ResolvedTheme;
  onSelect: (provider: SignInType) => void;
  onShowSocials: () => void;
}

export const DefaultView: FC<DefaultViewProps> = ({
  theme,
  onSelect,
  onShowSocials,
}) => {
  return (
    <div className="oko-default-view">
      <div className="oko-logo-wrapper">
        <img src={S3_LOGO_URL[theme]} alt="Oko" width="84" height="32" />
      </div>
      <div className="oko-provider-list">
        <ProviderButton
          icon={<EmailIcon />}
          label="Email"
          onClick={() => onSelect("email")}
        />
        <ProviderButton
          icon={<GoogleIcon />}
          label="Google"
          onClick={() => onSelect("google")}
        />
        <button
          className="oko-provider-btn"
          onClick={onShowSocials}
          type="button"
        >
          <span className="oko-social-icons-wrapper">
            <span className="oko-social-icon">
              <XSmallIcon />
            </span>
            <span className="oko-social-icon">
              <TelegramSmallIcon />
            </span>
            <span className="oko-social-icon">
              <AppleSmallIcon />
            </span>
          </span>
          <span className="oko-provider-label">Other Socials</span>
          <span className="oko-chevron-icon">
            <ChevronRightIcon />
          </span>
        </button>
      </div>
      <div className="oko-modal-footer">
        <img
          className="oko-footer-logo"
          src={S3_LOGO_WITH_NAME_URL[theme]}
          alt="Oko"
          width="52"
          height="20"
        />
        <a
          className="oko-footer-link"
          href="https://okowallet.userjot.com/board/report-bugs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get support
          <span className="oko-external-icon">
            <ExternalLinkIcon />
          </span>
        </a>
      </div>
    </div>
  );
};
