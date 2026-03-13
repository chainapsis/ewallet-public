import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import type { OpenModalAckPayload } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import styles from "./modal.module.scss";
import { ModalDialog } from "./modal_dialog";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

export const Modal: FC = () => {
  const modalRequest = useMemoryState((st) => st.modalRequest);
  const isOpen = !!modalRequest;

  const { closeModal, clearError } = useMemoryState();

  function onOpenChange(open: boolean) {
    console.log("onOpenChange(): %s", open);

    if (modalRequest) {
      const { modal_type, modal_id } = modalRequest.msg.payload;
      const { error } = useMemoryState.getState();

      if (error) {
        closeModal(error);
        clearError();
        return;
      } else {
        const payload: OpenModalAckPayload = {
          modal_type,
          modal_id,
          type: "reject",
        };

        closeModal(payload);
      }
    }
  }

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange,
    placement: "bottom",
  });

  const click = useClick(context);
  const role = useRole(context);
  const dismiss = useDismiss(context, {
    outsidePressEvent: "mousedown",
    outsidePress: (event) => event.button !== 2,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    role,
    dismiss,
  ]);

  const headingId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        ref={refs.setReference}
        className={styles.invisible}
        {...getReferenceProps()}
      />
      <FloatingPortal>
        {isOpen && (
          <FloatingOverlay className={styles.overlay} lockScroll>
            <FloatingFocusManager context={context} initialFocus={-1}>
              <div
                className={styles.floatingWrapper}
                ref={refs.setFloating}
                aria-labelledby={headingId}
                aria-describedby={descriptionId}
                {...getFloatingProps()}
              >
                <ModalDialog modalRequest={modalRequest} />
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        )}
      </FloatingPortal>
    </>
  );
};
