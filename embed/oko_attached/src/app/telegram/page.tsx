import { AttachedInitialized } from "@oko-wallet-attached/components/attached_initialized/attached_initialized";
import { TelegramLoginPopup } from "@oko-wallet-attached/components/telegram/telegram_login_popup";

export default function Page() {
  return (
    <AttachedInitialized>
      <TelegramLoginPopup />
    </AttachedInitialized>
  );
}
