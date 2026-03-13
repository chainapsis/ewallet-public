import { render } from "preact";

import { resolveTheme } from "./hooks/use_theme";
import { SignInModal } from "./signin_modal";
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

  const preactRoot = document.createElement("div");
  shadow.appendChild(preactRoot);

  const originalOverflow = document.body.style.overflow;
  document.body.appendChild(container);
  document.body.style.overflow = "hidden";

  const cleanup = () => {
    document.body.style.overflow = originalOverflow;
    render(null, preactRoot);
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

  render(
    <SignInModal onSelect={handleSelect} onClose={handleClose} theme={theme} />,
    preactRoot,
  );
}
