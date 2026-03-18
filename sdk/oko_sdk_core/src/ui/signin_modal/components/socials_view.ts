import { htmlFromString } from "../dom_utils";
import {
  AppleIcon,
  ChevronLeftIcon,
  DiscordIcon,
  GithubIcon,
  TelegramIcon,
  XIcon,
} from "./icons";
import { createProviderButton } from "./provider_button";
import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";

export interface SocialsViewOptions {
  onSelect: (provider: SignInType) => void;
  onBack: () => void;
}

export function createSocialsView(options: SocialsViewOptions): HTMLDivElement {
  const { onSelect, onBack } = options;

  const el = htmlFromString<HTMLDivElement>(`
    <div class="oko-socials-view">
      <div class="oko-back-row">
        <button class="oko-back-btn" type="button"></button>
        <span class="oko-back-title">Login or sign up</span>
      </div>
      <div class="oko-provider-list oko-socials-list"></div>
    </div>
  `);

  const backBtn = el.querySelector(".oko-back-btn")!;
  backBtn.appendChild(ChevronLeftIcon());
  backBtn.addEventListener("click", onBack);

  el.querySelector(".oko-provider-list")!.append(
    createProviderButton({
      icon: XIcon(),
      label: "X",
      onClick: () => onSelect("x"),
    }),
    createProviderButton({
      icon: TelegramIcon(),
      label: "Telegram",
      onClick: () => onSelect("telegram"),
    }),
    createProviderButton({
      icon: DiscordIcon(),
      label: "Discord",
      onClick: () => onSelect("discord"),
    }),
    createProviderButton({
      icon: GithubIcon(),
      label: "GitHub",
      onClick: () => onSelect("github"),
    }),
    createProviderButton({
      icon: AppleIcon(),
      label: "Apple",
      disabled: true,
    }),
  );

  return el;
}
