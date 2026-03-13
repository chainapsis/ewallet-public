import { type FC, useState } from "react";

import styles from "./styles.module.scss";
import {
  SignerAddressOrEmailChangeViewTypeButton,
  SignerAddressOrEmailView,
} from "@oko-wallet-attached/components/modal_variants/common/metadata_content/signer_address_or_email/signer_address_or_email";

interface SignerInfoProps {
  signer: string;
  origin: string;
  initialViewType?: "View Address" | "Login Info";
}

export const SignerInfo: FC<SignerInfoProps> = ({
  signer,
  origin,
  initialViewType = "View Address",
}) => {
  const [viewType, setViewType] = useState<"View Address" | "Login Info">(
    initialViewType,
  );

  switch (viewType) {
    case "View Address":
      return (
        <div className={styles.wrapper}>
          <SignerAddressOrEmailView
            value={signer}
            type="address"
            origin={origin}
            prefix="with "
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
            prefix="with "
          />
          <SignerAddressOrEmailChangeViewTypeButton
            viewType="View Address"
            onClick={() => setViewType("View Address")}
          />
        </div>
      );
  }
};
