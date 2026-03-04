import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import Image from "next/image";
import type { FC } from "react";

import styles from "./whole_page_loading.module.scss";
import { DashboardHeader } from "@oko-wallet-user-dashboard/components/dashboard_header/dashboard_header";
import { OkoLoader } from "@oko-wallet-user-dashboard/components/loader/oko_loader";
import { SignInImage } from "@oko-wallet-user-dashboard/components/sign_in_image/sign_in_image";

export const WholePageLoading: FC = () => {
  const description =
    "Everything you hold, all in one place. \n Check your balances, addresses, \n and connected apps at a glance.";

  return (
    <>
      <div className={cn(styles.wrapper, styles.desktop)}>
        <DashboardHeader position="absolute" logoVariant="white" />
        <div className={styles.body}>
          <SignInImage>
            <div className={styles.inner}>
              <Image
                src="/oko_home.png"
                alt="Oko Home"
                width={231.78}
                height={36}
                className={styles.title}
                quality={100}
              />
              <Typography
                tagType="p"
                size="xl"
                weight="medium"
                color="white"
                className={styles.description}
              >
                {description}
              </Typography>
            </div>
          </SignInImage>
          <div className={styles.content}>
            <OkoLoader size={80} />
          </div>
        </div>
      </div>

      <div className={cn(styles.wrapper, styles.mobile)}>
        <SignInImage>
          <div className={styles.spinnerWrapper}>
            <OkoLoader size={80} />
          </div>
        </SignInImage>
      </div>
    </>
  );
};
