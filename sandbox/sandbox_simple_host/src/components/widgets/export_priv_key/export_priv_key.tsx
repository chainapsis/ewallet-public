import type { OkoWalletMsgOpenModal } from "@oko-wallet/oko-sdk-core";
import { type FC, useState } from "react";

import { Widget } from "@/components/widgets/widget_components";
import { useOko } from "@/hooks/use_oko";
import styles from "./export_priv_key.module.scss";

export const ExportPrivKeyWidget: FC = () => {
  const { okoCosmos } = useOko();
  const [_, setIsSigningIn] = useState(false);

  const handleClickExport = async () => {
    try {
      if (okoCosmos) {
        okoCosmos.okoWallet.getName();
      }
      console.log(123);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.title}>Export private key</div>
        <button type="button" onClick={handleClickExport}>
          Export
        </button>
      </div>
    </Widget>
  );
};
