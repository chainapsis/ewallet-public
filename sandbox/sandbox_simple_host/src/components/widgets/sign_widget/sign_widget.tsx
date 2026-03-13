import { type FC, type ReactElement, useState } from "react";

import { MockDappModal } from "@/components/widgets/sign_widget/mock_dapp_modal/mock_dapp_modal";
import styles from "@/components/widgets/sign_widget/sign_widget.module.scss";
import { Widget } from "@/components/widgets/widget_components";

export type SignWidgetInnerProps = SignWidgetProps & {
  onOpenModal?: () => void;
  hideDappModalButton?: boolean;
};

export const SignWidgetContent: FC<SignWidgetInnerProps> = ({
  chain,
  chainIcon,
  signType,
  signButtonOnClick,
  isLoading,
  onOpenModal,
  hideDappModalButton,
}) => {
  const signTitle =
    signType === "offchain"
      ? "Sign an Offchain Message"
      : "Sign an Onchain Message";

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.titleRow}>
          <div className={styles.chainBadge}>
            {chainIcon}
            <p>{chain}</p>
          </div>
          <p>{signTitle}</p>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Signing...</div>
        ) : (
          <Description signType={signType} />
        )}

        <button type="button" onClick={signButtonOnClick}>
          Sign
        </button>
        {!hideDappModalButton && (
          <button type="button" onClick={onOpenModal ?? signButtonOnClick}>
            Sign with dapp modal
          </button>
        )}
      </div>
    </Widget>
  );
};

export const SignWidget: FC<SignWidgetProps> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <SignWidgetContent {...props} onOpenModal={openModal} />
      <MockDappModal
        isOpen={isModalOpen}
        onClose={closeModal}
        signWidgetProps={props}
      />
    </>
  );
};

const Description = ({ signType }: { signType: SignType }) => {
  return (
    <>
      {signType === "offchain" && (
        <div className={styles.infoBox}>
          <p className={styles.infoParagraph}>
            <span>Why use offchain signatures?</span>
          </p>
          <ul className={styles.infoList}>
            <li>Prove wallet ownership</li>
            <li>Authenticate without gas fees</li>
            <li>No transaction is sent on-chain</li>
          </ul>
        </div>
      )}
      {signType === "onchain" && (
        <div className={styles.onchainTest}>
          <p>This is a demo ✨</p>
          <p>No transaction will be sent on-chain.</p>
        </div>
      )}
    </>
  );
};

export interface SignWidgetProps {
  chain: string;
  chainIcon?: ReactElement;
  signType: SignType;
  signButtonOnClick: () => void;
  isLoading?: boolean;
}

type SignType = "offchain" | "onchain";
