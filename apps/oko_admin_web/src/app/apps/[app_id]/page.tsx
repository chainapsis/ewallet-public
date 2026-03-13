"use client";

import { use } from "react";

import styles from "./page.module.scss";
import { useGetCustomer } from "@oko-wallet-admin/components/apps_view/use_get_customer";

export default function Page({ params }: AppDetailPageParams) {
  const unwrappedParams = use(params);

  const { data: customer } = useGetCustomer({
    customer_id: unwrappedParams.app_id,
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.customer_card}>
        <div className={styles.customer_card_header}>
          <div className={styles.customer_card_header_logo}>
            {customer?.logo_url && (
              <img
                src={customer.logo_url}
                alt={customer.label ?? "logo"}
                width={50}
                height={50}
              />
            )}
          </div>
          <div className={styles.customer_card_header_info}>
            <div className={styles.customer_card_header_id}>
              {customer?.customer_id}
            </div>
            <div className={styles.customer_card_header_name}>
              {customer?.label}
            </div>
          </div>
        </div>
        <div className={styles.customer_card_body}>
          <div className={styles.customer_card_body_item}>
            {customer?.url && (
              <div className={styles.customer_card_body_item_label}>URL</div>
            )}

            {customer?.url && (
              <div className={styles.customer_card_body_item_value}>
                {customer?.url}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface AppDetailPageParams {
  params: Promise<{
    app_id: string;
  }>;
}
