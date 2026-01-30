import { useState, type FC, type ReactNode } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { EyeIcon } from "@oko-wallet/oko-common-ui/icons/eye";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { useAppState } from "@oko-wallet-attached/store/app";
import styles from "./signer_address_or_email.module.scss";

function renderAuthIcon(authType: AuthType | undefined): ReactNode {
  switch (authType) {
    case "google":
      return <GoogleIcon width={16} height={16} />;
    case "x":
      return <XIcon size={16} />;
    case "telegram":
      return <TelegramIcon size={16} />;
    case "discord":
      return <DiscordIcon size={16} />;
    default:
      return null;
  }
}

interface SignerAddressOrEmailProps {
  signer: string;
  origin: string;
  initialViewType: "View Address" | "Login Info" | null;
}

interface ViewProps {
  value: string;
  origin: string;
  type: "address" | "email";
  prefix?: string;
}

export const SignerAddressOrEmailView: FC<ViewProps> = ({
  value,
  type,
  origin,
  prefix,
}) => {
  const wallet = useAppState((state) => state.getWallet(origin));
  const email = wallet?.email;
  const authType = wallet?.authType;

  const displayValue =
    type === "address" ? `${value.slice(0, 9)}...${value.slice(-9)}` : email;

  return (
    <>
      {type === "email" && renderAuthIcon(authType)}
      <Typography size="sm" color="brand-tertiary" weight="medium">
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
  origin,
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
          <SignerAddressOrEmailView
            value={signer}
            type="address"
            origin={origin}
          />
          <SignerAddressOrEmailChangeViewTypeButton
            viewType="Login Info"
            onClick={() => setViewType("Login Info")}
          />
        </div>
      );
    case "Login Info":
      return (
        <div className={styles.wrapper}>
          <SignerAddressOrEmailView
            value={signer}
            type="email"
            origin={origin}
          />
          <SignerAddressOrEmailChangeViewTypeButton
            viewType="View Address"
            onClick={() => setViewType("View Address")}
          />
        </div>
      );
  }
};
