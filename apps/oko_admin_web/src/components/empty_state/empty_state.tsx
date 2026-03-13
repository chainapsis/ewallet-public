import { Button } from "@oko-wallet/oko-common-ui/button";
import type { FC } from "react";

import styles from "./empty_state.module.scss";

interface EmptyStateProps {
  text: string;
  showButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
}

export const EmptyState: FC<EmptyStateProps> = ({
  text,
  showButton = false,
  buttonText,
  onButtonClick,
}: EmptyStateProps) => {
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    }
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.text}>{text}</p>
      {showButton && (
        <Button size="lg" onClick={handleButtonClick}>
          {buttonText}
        </Button>
      )}
    </div>
  );
};
