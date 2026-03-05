import { createFileRoute } from "@tanstack/react-router";

import { GithubCallback } from "@oko-wallet-attached/components/github_callback/github_callback";

export const Route = createFileRoute("/github/callback/")({
  component: GithubCallback,
});
