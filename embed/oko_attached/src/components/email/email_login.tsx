import { useEffect, useMemo, type FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { EmailLoginModalPayload } from "@oko-wallet/oko-sdk-core";

import { AttachedInitialized } from "@oko-wallet-attached/components/attached_initialized/attached_initialized";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { EmailLoginPopup } from "./email_login_popup";
import { LoginPopupErrorView } from "../login_popup/login_popup_error_view";
import styles from "./email_login.module.scss";

/**
 * Build email modal data from URL query params (RN mode).
 * When the email login page is opened in a system browser by the RN SDK,
 * there is no MemoryState — nonce and state come from URL params instead.
 */
function useRnEmailModalPayload(): {
  modalId: string;
  data: EmailLoginModalPayload["data"];
} | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const rnNonce = params.get("rn_nonce");
    const rnState = params.get("rn_state");
    const modalId = params.get("modal_id");
    if (!rnNonce || !rnState || !modalId) return null;
    return {
      modalId,
      data: {
        email_hint: null,
        oauth: { nonce: rnNonce, state: rnState },
      },
    };
  }, []);
}

export const EmailLogin: FC = () => {
  useNotifyPopupReady();

  const isInlineLayout = useInlinePopupLayout();
  const modalRequest = useMemoryState((state) => state.modalRequest);
  const error = useMemoryState((state) => state.error);
  const emailModalPayload =
    modalRequest?.msg.payload.modal_type === "auth/email_login"
      ? modalRequest.msg.payload
      : null;

  // Fallback: RN mode — read from URL query params
  const rnPayload = useRnEmailModalPayload();

  const effectiveModalId = emailModalPayload?.modal_id ?? rnPayload?.modalId;
  const effectiveData = emailModalPayload?.data ?? rnPayload?.data;

  return (
    <AttachedInitialized>
      <div className={styles.wrapper}>
        <div className={styles.content}>
          {isInlineLayout ? (
            error ? (
              <LoginPopupErrorView error={error} />
            ) : effectiveModalId && effectiveData ? (
              <EmailLoginPopup
                modalId={effectiveModalId}
                data={effectiveData}
              />
            ) : (
              <LoadingCard />
            )
          ) : (
            <InlineOnlyNotice />
          )}
        </div>
      </div>
    </AttachedInitialized>
  );
};

const LoadingCard: FC = () => <div className={styles.blankPanel} />;

const InlineOnlyNotice: FC = () => (
  <div className={styles.panel}>
    <div className={styles.loadingState}>
      <Typography size="md" color="secondary">
        Please launch the Oko login popup from the host application.
      </Typography>
    </div>
  </div>
);

function useNotifyPopupReady() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modalId = params.get("modal_id");
    const hostOrigin = params.get("host_origin");

    if (!modalId || !hostOrigin || !window.opener) {
      return;
    }

    window.opener.postMessage(
      {
        target: "oko_attached_popup",
        msg_type: "popup_ready",
        payload: { modal_id: modalId },
      },
      hostOrigin,
    );
  }, []);
}

function useInlinePopupLayout() {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const layout = searchParams.get("popup_layout");

    if (layout) {
      return layout === "inline";
    }

    return !!window.opener;
  }, []);
}
