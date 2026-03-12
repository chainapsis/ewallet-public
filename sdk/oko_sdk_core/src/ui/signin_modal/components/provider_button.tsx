import type { ComponentChildren, FunctionComponent } from "preact";

export interface ProviderButtonProps {
  icon: ComponentChildren;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  chevron?: ComponentChildren;
}

export const ProviderButton: FunctionComponent<ProviderButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  chevron,
}) => {
  return (
    <button
      className="oko-provider-btn"
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <span className="oko-provider-icon">{icon}</span>
      <span className="oko-provider-label">{label}</span>
      {chevron && <span className="oko-chevron-icon">{chevron}</span>}
    </button>
  );
};
