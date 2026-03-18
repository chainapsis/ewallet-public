import { createDefaultView } from "./components/default_view";
import { CloseIcon } from "./components/icons";
import { createProgressView } from "./components/progress_view";
import { createSocialsView } from "./components/socials_view";
import { htmlFromString } from "./dom_utils";
import type { ProgressState, ResolvedTheme, SignInModalTheme } from "./types";
import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";

export interface SignInModalController {
  element: HTMLDivElement;
  destroy: () => void;
  updateTheme: (theme: ResolvedTheme) => void;
}

export interface SignInModalProps {
  onSelect: (provider: SignInType) => Promise<void>;
  onClose: () => void;
  theme?: SignInModalTheme;
}

type ViewType = "default" | "socials";

export function createSignInModal(
  props: SignInModalProps,
): SignInModalController {
  const { onSelect, onClose } = props;

  let currentView: ViewType = "default";
  let progress: ProgressState | null = null;
  let resolvedTheme: ResolvedTheme = "light";
  let destroyed = false;

  const overlay = htmlFromString<HTMLDivElement>(`
    <div class="oko-modal-overlay">
      <div class="oko-modal-container">
        <button class="oko-modal-close" type="button" aria-label="Close modal"></button>
        <div class="oko-content-wrapper"></div>
      </div>
    </div>
  `);

  const closeBtn = overlay.querySelector(".oko-modal-close")!;
  closeBtn.appendChild(CloseIcon());
  closeBtn.addEventListener("click", () => onClose());

  const contentWrapper = overlay.querySelector(
    ".oko-content-wrapper",
  ) as HTMLDivElement;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      onClose();
    }
  });

  function renderContent() {
    if (destroyed) {
      return;
    }
    contentWrapper.replaceChildren();

    if (progress) {
      contentWrapper.appendChild(
        createProgressView({
          status: progress.status,
          provider: progress.provider,
          onRetry: handleRetry,
        }),
      );
    } else if (currentView === "socials") {
      contentWrapper.appendChild(
        createSocialsView({
          onSelect: handleSelect,
          onBack: () => {
            currentView = "default";
            renderContent();
          },
        }),
      );
    } else {
      contentWrapper.appendChild(
        createDefaultView({
          theme: resolvedTheme,
          onSelect: handleSelect,
          onShowSocials: () => {
            currentView = "socials";
            renderContent();
          },
        }),
      );
    }
  }

  async function handleSelect(provider: SignInType) {
    progress = { status: "loading", provider };
    renderContent();
    try {
      await onSelect(provider);
    } catch {
      if (!destroyed) {
        progress = { status: "failed", provider };
        renderContent();
      }
    }
  }

  function handleRetry() {
    progress = null;
    currentView = "default";
    renderContent();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  renderContent();

  return {
    element: overlay,
    destroy() {
      destroyed = true;
      document.removeEventListener("keydown", handleKeyDown);
    },
    updateTheme(theme: ResolvedTheme) {
      resolvedTheme = theme;
      if (!progress && currentView === "default") {
        renderContent();
      }
    },
  };
}
