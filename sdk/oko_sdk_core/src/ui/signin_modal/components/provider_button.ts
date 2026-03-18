import { htmlFromString } from "../dom_utils";

export interface ProviderButtonOptions {
  icon: SVGSVGElement;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  chevron?: SVGSVGElement;
}

export function createProviderButton(
  options: ProviderButtonOptions,
): HTMLButtonElement {
  const { icon, label, onClick, disabled = false, chevron } = options;

  const btn = htmlFromString<HTMLButtonElement>(`
    <button class="oko-provider-btn" type="button">
      <span class="oko-provider-icon"></span>
      <span class="oko-provider-label">${label}</span>
    </button>
  `);

  if (disabled) {
    btn.disabled = true;
  }
  if (onClick) {
    btn.addEventListener("click", onClick);
  }

  btn.querySelector(".oko-provider-icon")!.appendChild(icon);

  if (chevron) {
    const chevronSpan = document.createElement("span");
    chevronSpan.className = "oko-chevron-icon";
    chevronSpan.appendChild(chevron);
    btn.appendChild(chevronSpan);
  }

  return btn;
}
