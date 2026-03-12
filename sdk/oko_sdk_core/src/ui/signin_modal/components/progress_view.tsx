import type { FunctionComponent as FC } from "preact";

import {
  DiscordIcon,
  EmailIcon,
  GithubIcon,
  GoogleIcon,
  SpinnerFailedIcon,
  SpinnerLoadingIcon,
  TelegramIcon,
  XIcon,
} from "./icons";
import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";

export interface ProgressViewProps {
  status: "loading" | "failed";
  provider: SignInType;
  onRetry: () => void;
}

const PROVIDER_ICONS: Record<SignInType, FC> = {
  email: EmailIcon,
  google: GoogleIcon,
  x: XIcon,
  telegram: TelegramIcon,
  discord: DiscordIcon,
  github: GithubIcon,
};

export const ProgressView: FC<ProgressViewProps> = ({
  status,
  provider,
  onRetry,
}) => {
  const isLoading = status === "loading";
  const ProviderIcon = PROVIDER_ICONS[provider];

  return (
    <div className="oko-progress-view">
      <div className="oko-progress-circle">
        <span className="oko-provider-icon">
          <ProviderIcon />
        </span>
        <span
          className={`oko-spinner-overlay${isLoading ? " oko-spinning" : ""}`}
        >
          {isLoading ? <SpinnerLoadingIcon /> : <SpinnerFailedIcon />}
        </span>
      </div>
      <div className="oko-progress-text">
        {isLoading ? "Signing in" : "Login failed"}
      </div>
      {status === "failed" && (
        <button className="oko-retry-btn" onClick={onRetry} type="button">
          Retry
        </button>
      )}
    </div>
  );
};
