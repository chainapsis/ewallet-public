import { observeTheme, resolveTheme } from "./hooks/use_theme";
import { createSignInModal } from "./signin_modal";
import { modalStyles } from "./styles";
import type { SignInModalOptions } from "./types";

const SIGNIN_MODAL_CONTAINER_ID = "oko-signin-modal-root";

export function renderSignInModal(options: SignInModalOptions) {
  if (typeof document === "undefined") {
    throw new Error("renderSignInModal cannot be called in SSR environment");
  }

  const { onSelect, onClose, theme = "system" } = options;

  const container = document.createElement("div");
  container.id = SIGNIN_MODAL_CONTAINER_ID;
  container.dataset.theme = resolveTheme(theme);

  const shadow = container.attachShadow({ mode: "closed" });

  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(modalStyles);
  shadow.adoptedStyleSheets = [styleSheet];

  const originalOverflow = document.body.style.overflow;
  document.body.appendChild(container);
  document.body.style.overflow = "hidden";

  const cleanup = () => {
    document.body.style.overflow = originalOverflow;
    modal.destroy();
    cleanupTheme();
    container.remove();
  };

  const handleClose = () => {
    cleanup();
    onClose?.();
  };

  const handleSelect = async (provider: Parameters<typeof onSelect>[0]) => {
    await onSelect(provider);
    cleanup();
  };

  const modal = createSignInModal({
    onSelect: handleSelect,
    onClose: handleClose,
    theme,
  });

  const cleanupTheme = observeTheme(theme, (resolved) => {
    container.dataset.theme = resolved;
    modal.updateTheme(resolved);
  });

  shadow.appendChild(modal.element);
}
