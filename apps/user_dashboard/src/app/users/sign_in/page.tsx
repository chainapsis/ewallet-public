import { OkoLogoIcon } from "@oko-wallet/oko-common-ui/icons/oko_logo_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import Image from "next/image";

import styles from "./page.module.scss";
import { DashboardHeader } from "@oko-wallet-user-dashboard/components/dashboard_header/dashboard_header";
import { SignInImage } from "@oko-wallet-user-dashboard/components/sign_in_image/sign_in_image";
import { AccountWidget } from "@oko-wallet-user-dashboard/components/widgets/account_widget/account_widget";

export default function Page() {
  const description =
    "Everything you hold, all in one place. \n Check your balances, addresses, \n and connected apps at a glance.";

  return (
    <>
      <div className={cn(styles.wrapper, styles.desktop)}>
        <DashboardHeader theme="dark" position="absolute" />
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
            <AccountWidget />
          </div>
        </div>
      </div>

      <div className={cn(styles.wrapper, styles.mobile)}>
        <SignInImage>
          <div className={styles.inner}>
            <OkoLogoIcon className={styles.mobileLogo} width={58} height={22} />
            <Typography
              tagType="p"
              size="md"
              weight="medium"
              color="white"
              className={styles.description}
            >
              {description}
            </Typography>
            <AccountWidget />
          </div>
        </SignInImage>
      </div>
    </>
  );
}
