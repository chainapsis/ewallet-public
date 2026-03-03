import { type FunctionComponent as FC } from "preact";

import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";
import { ProviderButton } from "./provider_button";
import {
  XIcon,
  TelegramIcon,
  DiscordIcon,
  GithubIcon,
  AppleIcon,
  ChevronLeftIcon,
} from "./icons";

export interface SocialsViewProps {
  onSelect: (provider: SignInType) => void;
  onBack: () => void;
}

export const SocialsView: FC<SocialsViewProps> = ({ onSelect, onBack }) => {
  return (
    <div className="oko-socials-view">
      <div className="oko-back-row">
        <button className="oko-back-btn" onClick={onBack} type="button">
          <ChevronLeftIcon />
        </button>
        <span className="oko-back-title">Login or sign up</span>
      </div>
      <div className="oko-provider-list oko-socials-list">
        <ProviderButton
          icon={<XIcon />}
          label="X"
          onClick={() => onSelect("x")}
        />
        <ProviderButton
          icon={<TelegramIcon />}
          label="Telegram"
          onClick={() => onSelect("telegram")}
        />
        <ProviderButton
          icon={<DiscordIcon />}
          label="Discord"
          onClick={() => onSelect("discord")}
        />
        <ProviderButton
          icon={<GithubIcon />}
          label="GitHub"
          onClick={() => onSelect("github")}
        />
        <ProviderButton icon={<AppleIcon />} label="Apple" disabled />
      </div>
    </div>
  );
};
