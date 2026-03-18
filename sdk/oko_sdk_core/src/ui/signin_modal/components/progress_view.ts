import { htmlFromString } from "../dom_utils";
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

export interface ProgressViewOptions {
  status: "loading" | "failed";
  provider: SignInType;
  onRetry: () => void;
}

const PROVIDER_ICONS: Record<SignInType, () => SVGSVGElement> = {
  email: EmailIcon,
  google: GoogleIcon,
  x: XIcon,
  telegram: TelegramIcon,
  discord: DiscordIcon,
  github: GithubIcon,
};

export function createProgressView(
  options: ProgressViewOptions,
): HTMLDivElement {
  const { status, provider, onRetry } = options;
  const isLoading = status === "loading";

  const el = htmlFromString<HTMLDivElement>(`
    <div class="oko-progress-view">
      <div class="oko-progress-circle">
        <span class="oko-provider-icon"></span>
        <span class="oko-spinner-overlay${isLoading ? " oko-spinning" : ""}"></span>
      </div>
      <div class="oko-progress-text">${isLoading ? "Signing in" : "Login failed"}</div>
    </div>
  `);

  el.querySelector(".oko-provider-icon")!.appendChild(
    PROVIDER_ICONS[provider](),
  );
  el.querySelector(".oko-spinner-overlay")!.appendChild(
    isLoading ? SpinnerLoadingIcon() : SpinnerFailedIcon(),
  );

  if (status === "failed") {
    const retryBtn = htmlFromString<HTMLButtonElement>(
      `<button class="oko-retry-btn" type="button">Retry</button>`,
    );
    retryBtn.addEventListener("click", onRetry);
    el.appendChild(retryBtn);
  }

  return el;
}
