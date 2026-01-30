import { Typography } from "@oko-wallet/oko-common-ui/typography";

import { TRANSACTION_HISTORY_SUPPORT_LIST } from "./constant";
import styles from "./page.module.scss";
import { TxHistorySupportItem } from "@oko-wallet-user-dashboard/components/tx_history_support_item/tx_history_support_item";

export default function Page() {
  return (
    <>
      <Typography tagType="h1" size="xl" weight="semibold" color="primary">
        Transaction History
      </Typography>

      <div className={styles.textContainer}>
        <Typography tagType="h2" size="lg" weight="semibold" color="primary">
          Coming Soon ⚡️
        </Typography>

        <Typography tagType="p" size="sm" weight="medium" color="tertiary">
          View your transactions and their details on explorers in the meantime.
        </Typography>
      </div>

      <div className={styles.gridContainer}>
        {TRANSACTION_HISTORY_SUPPORT_LIST.map((item, index) => {
          return (
            <TxHistorySupportItem
              key={index}
              chainId={item.chainId}
              explorerName={item.explorerName}
              explorerUrl={item.explorerUrl}
            />
          );
        })}
      </div>
    </>
  );
}
