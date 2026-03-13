import type { FunctionComponent as FC, JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import { DefaultView } from "./components/default_view";
import { CloseIcon } from "./components/icons";
import { ProgressView } from "./components/progress_view";
import { SocialsView } from "./components/socials_view";
import { useTheme } from "./hooks/use_theme";
import type { ProgressState, SignInModalTheme } from "./types";
import type { SignInType } from "@oko-wallet-sdk-core/types/oauth";

export interface SignInModalProps {
  onSelect: (provider: SignInType) => Promise<void>;
  onClose: () => void;
  theme?: SignInModalTheme;
}

type ViewType = "default" | "socials";

export const SignInModal: FC<SignInModalProps> = ({
  onSelect,
  onClose,
  theme,
}) => {
  const [view, setView] = useState<ViewType>("default");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const resolvedTheme = useTheme(theme || "system");

  const handleSelect = async (provider: SignInType) => {
    setProgress({ status: "loading", provider });
    try {
      await onSelect(provider);
    } catch {
      setProgress({ status: "failed", provider });
    }
  };

  const handleRetry = () => {
    setProgress(null);
    setView("default");
  };

  const handleOverlayClick = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const content = useMemo(() => {
    if (progress) {
      return (
        <ProgressView
          status={progress.status}
          provider={progress.provider}
          onRetry={handleRetry}
        />
      );
    }

    if (view === "socials") {
      return (
        <SocialsView
          onSelect={handleSelect}
          onBack={() => setView("default")}
        />
      );
    }

    return (
      <DefaultView
        theme={resolvedTheme}
        onSelect={handleSelect}
        onShowSocials={() => setView("socials")}
      />
    );
  }, [progress, resolvedTheme, handleSelect]);

  return (
    <div className="oko-modal-overlay" onClick={handleOverlayClick}>
      <div className="oko-modal-container">
        <button
          className="oko-modal-close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          <CloseIcon />
        </button>
        <div className="oko-content-wrapper">{content}</div>
      </div>
    </div>
  );
};
