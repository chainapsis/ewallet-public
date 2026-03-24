import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { EyeIcon } from "@oko-wallet/oko-common-ui/icons/eye";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { type FC, type ReactNode, useState } from "react";

import styles from "./signer_address_or_email.module.scss";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

function renderAuthIcon(
  authType: AuthType | undefined,
  size: number = 16,
): ReactNode {
  switch (authType) {
    case "google":
      return <GoogleIcon width={size} height={size} />;
    case "x":
      return <XIcon size={size} />;
    case "telegram":
      return <TelegramIcon size={size} />;
    case "discord":
      return <DiscordIcon size={size} />;
    default:
      return null;
  }
}

interface SignerAddressOrEmailProps {
  signer: string;
  initialViewType: "View Address" | "Login Info" | null;
}

interface ViewProps {
  value: string;
  type: "address" | "email";
  prefix?: string;
}

export const SignerAddressOrEmailView: FC<ViewProps> = ({
  value,
  type,
  prefix,
}) => {
  const storageKey = useMemoryState((state) => state.storageKey);
  const wallet = useAppState((state) => state.getWallet(storageKey));
  const email = wallet?.email;
  const authType = wallet?.authType;
  const isMobile = useMobileMode();

  const displayValue =
    type === "address" ? `${value.slice(0, 9)}...${value.slice(-9)}` : email;

  return (
    <>
      {type === "email" && renderAuthIcon(authType, isMobile ? 20 : 16)}
      <Typography
        size={isMobile ? "md" : "sm"}
        color="brand-tertiary"
        weight="medium"
      >
        {prefix && `${prefix} `}
        {displayValue}
      </Typography>
    </>
  );
};

interface SignerAddressOrEmailChangeViewTypeButtonProps {
  viewType: "View Address" | "Login Info";
  onClick: () => void;
}

export const SignerAddressOrEmailChangeViewTypeButton: FC<
  SignerAddressOrEmailChangeViewTypeButtonProps
> = ({ viewType, onClick }) => {
  return (
    <div onClick={onClick} className={styles.changeViewTypeButton}>
      <EyeIcon size={12} color="var(--fg-quaternary)" />
      <Typography size="xs" color="quaternary" weight="semibold">
        {viewType}
      </Typography>
    </div>
  );
};

export const SignerAddressOrEmail: FC<SignerAddressOrEmailProps> = ({
  signer,
  initialViewType,
}) => {
  const [viewType, setViewType] = useState<
    "View Address" | "Login Info" | null
  >(initialViewType);

  switch (viewType) {
    case null:
    case "View Address":
      return (
        <div className={styles.wrapper}>
          <SignerAddressOrEmailView value={signer} type="address" />
          <SignerAddressOrEmailChangeViewTypeButton
            viewType="Login Info"
            onClick={() => setViewType("Login Info")}
          />
        </div>
      );
    case "Login Info":
      return (
        <div className={styles.wrapper}>
          <SignerAddressOrEmailView value={signer} type="email" />
          <SignerAddressOrEmailChangeViewTypeButton
            viewType="View Address"
            onClick={() => setViewType("View Address")}
          />
        </div>
      );
  }
};
