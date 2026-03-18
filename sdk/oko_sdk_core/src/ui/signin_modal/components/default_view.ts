import { htmlFromString } from "../dom_utils";
import { S3_LOGO_URL, S3_LOGO_WITH_NAME_URL } from "../icons";
import type { ResolvedTheme } from "../types";
import {
  AppleSmallIcon,
  ChevronRightIcon,
  EmailIcon,
  ExternalLinkIcon,
  GoogleIcon,
  TelegramSmallIcon,
  XSmallIcon,
} from "./icons";
import { createProviderButton } from "./provider_button";
import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";

export interface DefaultViewOptions {
  theme: ResolvedTheme;
  onSelect: (provider: SignInType) => void;
  onShowSocials: () => void;
}

export function createDefaultView(options: DefaultViewOptions): HTMLDivElement {
  const { theme, onSelect, onShowSocials } = options;

  const el = htmlFromString<HTMLDivElement>(`
    <div class="oko-default-view">
      <div class="oko-logo-wrapper">
        <img src="${S3_LOGO_URL[theme]}" alt="Oko" width="84" height="32" />
      </div>
      <div class="oko-provider-list"></div>
      <div class="oko-modal-footer">
        <img
          class="oko-footer-logo"
          src="${S3_LOGO_WITH_NAME_URL[theme]}"
          alt="Oko"
          width="52"
          height="20"
        />
        <a
          class="oko-footer-link"
          href="https://okowallet.userjot.com/board/report-bugs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get support
          <span class="oko-external-icon"></span>
        </a>
      </div>
    </div>
  `);

  const providerList = el.querySelector(".oko-provider-list")!;
  providerList.append(
    createProviderButton({
      icon: EmailIcon(),
      label: "Email",
      onClick: () => onSelect("email"),
    }),
    createProviderButton({
      icon: GoogleIcon(),
      label: "Google",
      onClick: () => onSelect("google"),
    }),
    createSocialsButton(onShowSocials),
  );

  el.querySelector(".oko-external-icon")!.appendChild(ExternalLinkIcon());

  return el;
}

function createSocialsButton(onShowSocials: () => void): HTMLButtonElement {
  const btn = htmlFromString<HTMLButtonElement>(`
    <button class="oko-provider-btn" type="button">
      <span class="oko-social-icons-wrapper">
        <span class="oko-social-icon" data-icon="x"></span>
        <span class="oko-social-icon" data-icon="telegram"></span>
        <span class="oko-social-icon" data-icon="apple"></span>
      </span>
      <span class="oko-provider-label">Other Socials</span>
      <span class="oko-chevron-icon"></span>
    </button>
  `);

  btn.addEventListener("click", onShowSocials);

  btn.querySelector('[data-icon="x"]')!.appendChild(XSmallIcon());
  btn.querySelector('[data-icon="telegram"]')!.appendChild(TelegramSmallIcon());
  btn.querySelector('[data-icon="apple"]')!.appendChild(AppleSmallIcon());
  btn.querySelector(".oko-chevron-icon")!.appendChild(ChevronRightIcon());

  return btn;
}
