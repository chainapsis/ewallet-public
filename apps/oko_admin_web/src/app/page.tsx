import { RedirectType, redirect } from "next/navigation";

import { paths } from "@oko-wallet-admin/paths";

export default function Home() {
  return redirect(paths.apps, RedirectType.replace);
}
