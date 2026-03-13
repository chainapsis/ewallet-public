import { createFileRoute } from "@tanstack/react-router";

import { TelegramLogin } from "@oko-wallet-attached/components/telegram/telegram_login";

export const Route = createFileRoute("/telegram/")({
  component: TelegramLogin,
});
