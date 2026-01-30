import type { SvmMessageSignPayload } from "@oko-wallet/oko-sdk-core";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import { useMemo, type FC } from "react";

import styles from "@oko-wallet-attached/components/modal_variants/common/sign_in_content/sign_in_content.module.scss";
import {
  getSiwsMessage,
  verifySiwsMessage,
} from "@oko-wallet-attached/components/modal_variants/svm/siws_message";
import { SiwsSigTitleBadge } from "@oko-wallet-attached/components/modal_variants/svm/message_sig/siws_sig/siws_sig_title_badge";
import { SignerInfo } from "@oko-wallet-attached/components/modal_variants/common/signer_info";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { RiskWarningBox } from "@oko-wallet-attached/components/modal_variants/common/risk_warning/risk_warning";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { SOLANA_LOGO_URL } from "@oko-wallet-attached/constants/urls";
import { hexToUint8Array } from "@oko-wallet-attached/crypto/keygen_ed25519";

interface SvmSiwsSignatureContentProps {
  payload: SvmMessageSignPayload;
  theme: Theme | null;
}

export const SvmSiwsSignatureContent: FC<
  SvmSiwsSignatureContentProps
> = ({ payload, theme }) => {
  // Decode hex message to string
  const decodedMessage = useMemo(() => {
    try {
      const bytes = hexToUint8Array(payload.data.message);
      return new TextDecoder().decode(bytes);
    } catch {
      return payload.data.message;
    }
  }, [payload.data.message]);

  const message = getSiwsMessage(decodedMessage);
  if (!message) {
    // @unreachable
    throw new Error("unreachable");
  }

  const isValidSiwsMessage = verifySiwsMessage(message, payload.origin);

  return (
    <div>
      {isValidSiwsMessage ? <SiwsSigTitleBadge /> : <RiskWarningBox />}

      <div className={styles.metadataContainer}>
        <Spacing height={isValidSiwsMessage ? 8 : 12} />
        <Typography size="lg" color="primary" weight="semibold">
          Sign in to
        </Typography>

        <Spacing height={4} />
        <div className={styles.originRow}>
          <Typography
            size="lg"
            color={isValidSiwsMessage ? "primary" : "warning-primary"}
            weight="semibold"
          >
            {payload.origin.replace(/^https?:\/\//, "")}
          </Typography>
        </div>

        <Spacing height={8} />
        <SignerInfo
          origin={payload.origin}
          signer={payload.signer}
          initialViewType="Login Info"
        />
      </div>

      <Spacing height={20} />

      <div className={styles.chainInfoContainer}>
        <div className={styles.chainInfoRow}>
          <Typography size="xs" color="secondary" weight="semibold">
            Impact on balance
          </Typography>
          <Typography size="sm" color="secondary" weight="medium">
            None
          </Typography>
        </div>

        <Spacing height={8} />
        <div className={styles.chainInfoRow}>
          <Typography size="xs" color="secondary" weight="semibold">
            Network
          </Typography>

          <div className={styles.chainInfoRowContent}>
            <Avatar
              src={SOLANA_LOGO_URL}
              alt="Solana"
              size="sm"
              variant="rounded"
            />
            <Typography size="sm" color="secondary" weight="medium">
              Solana
            </Typography>
          </div>
        </div>
      </div>

      <Spacing height={16} />
      <MakeSignatureRawCodeBlockContainer className={styles.messageContainer}>
        <Typography color="tertiary" size="xs" weight="semibold">
          Message
        </Typography>

        <Spacing height={16} />
        <MakeSignatureRawCodeBlock
          code={message.statement ?? ""}
          className={styles.messageContent}
        />
      </MakeSignatureRawCodeBlockContainer>
    </div>
  );
};
