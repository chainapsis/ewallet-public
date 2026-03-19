import { createRoot } from "react-dom/client";

import { App } from "./App";
import { handleOAuthCallbackRedirect } from "./oauth_callback";

// OAuth callback pages (/google/callback, /x/callback, etc.) are real-path
// redirects from OAuth providers. Handle before mounting React — parse the
// response and redirect to /mobile/login/complete with params.
if (!handleOAuthCallbackRedirect()) {
  createRoot(document.getElementById("root")!).render(<App />);
}
