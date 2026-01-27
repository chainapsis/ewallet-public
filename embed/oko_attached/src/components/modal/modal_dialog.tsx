import { useEffect, useRef, type FC } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { MakeSignatureCosmosModal } from "@oko-wallet-attached/components/modal_variants/cosmos/make_signature_cosmos_modal";
import { MakeSignatureEthModal } from "@oko-wallet-attached/components/modal_variants/eth/make_sig_eth_modal";
import { MakeSignatureSvmModal } from "@oko-wallet-attached/components/modal_variants/svm/make_signature_svm_modal";
import type { ModalRequest } from "@oko-wallet-attached/store/memory/types";
import { ErrorModal } from "@oko-wallet-attached/components/modal_variants/error/error_modal";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { UnsupportedChainModal } from "../modal_variants/unsupported_chain/unsupported_chain_modal";
import { TelegramLoginModal } from "@oko-wallet-attached/components/modal_variants/auth/telegram_login/telegram_login_modal";
import { SessionExpiredModal } from "@oko-wallet-attached/components/modal_variants/session_expired/session_expired_modal";

export const ModalDialog: FC<ModalDialogProps> = ({ modalRequest }) => {
  const msg = modalRequest.msg;
  const { payload } = msg;

  const isAbortedRef = useRef(false);
  const { error, setError } = useMemoryState();

  useEffect(() => {
    // NOTE:Important modal _abort_ behavior
    // This component should mount when there is a new modal request.
    // Regardless of the previous state, we reset _isAborted_ to false when
    // the component gets mounted afresh
    isAbortedRef.current = false;
    console.log(
      "modal mounts, modalId: %s, isAborted: %s",
      modalRequest.msg.payload.modal_id,
      isAbortedRef.current,
    );

    return () => {
      // NOTE: Abort the modal operation everytime this component unmounts.
      // This ensures any in-progress operation trigerred from the previous
      // render will stop even if the component has been unmounted from the
      // React V-DOM tree.
      isAbortedRef.current = true;

      console.log(
        "modal unmounts, modalId: %s, isAborted: %s",
        modalRequest.msg.payload.modal_id,
        isAbortedRef.current,
      );
    };
  }, []);

  function getIsAborted() {
    return isAbortedRef.current;
  }

  if (error !== null) {
    if (error.error.type === "chain_not_supported") {
      return (
        <UnsupportedChainModal
          chainName={error.error.data.chain_name}
          chainSymbolImageUrl={error.error.data.chain_symbol_image_url}
          error={error}
        />
      );
    }

    // Session expired errors - show re-login modal
    const sessionExpiredErrors = [
      "api_key_not_found",
      "jwt_not_found",
      "wallet_not_found",
      "key_share_not_combined",
    ];
    if (sessionExpiredErrors.includes(error.error.type)) {
      return <SessionExpiredModal error={error} />;
    }

    return <ErrorModal error={error} />;
  }

  if (!payload) {
    // setError()
    // return <ErrorModal error={error} />;
    return null;
  }

  let component;
  switch (payload.modal_type) {
    case "eth/make_signature": {
      component = (
        <MakeSignatureEthModal
          data={payload.data}
          modalId={payload.modal_id}
          getIsAborted={getIsAborted}
        />
      );
      break;
    }

    case "cosmos/make_signature": {
      component = (
        <MakeSignatureCosmosModal
          getIsAborted={getIsAborted}
          data={payload.data}
          modalId={payload.modal_id}
        />
      );
      break;
    }

    case "svm/make_signature": {
      component = (
        <MakeSignatureSvmModal
          getIsAborted={getIsAborted}
          data={payload.data}
          modalId={payload.modal_id}
        />
      );
      break;
    }

    // case "auth/email_login": {
    //   component = (
    //     <EmailLoginModal modalId={payload.modal_id} data={payload.data} />
    //   );
    //   break;
    // }

    // case "auth/telegram_login": {
    //   component = (
    //     <TelegramLoginModal modalId={payload.modal_id} data={payload.data} />
    //   );
    //   break;
    // }

    default:
      //TODO 여기서 setError을 통해서 에러가 넘어가도록 수정 필요
      throw new Error("Not supported modal type");
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <ErrorModal
          error={{
            modal_type: "other",
            modal_id: payload.modal_id,
            type: "error",
            error: {
              type: "unknown_error",
              error,
            },
          }}
        />
      )}
      onError={(error) =>
        error instanceof Error ? error.message : String(error)
      }
    >
      {component}
    </ErrorBoundary>
  );
};

export interface ModalDialogProps {
  modalRequest: ModalRequest;
}
