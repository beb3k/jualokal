import { createFileRoute, redirect } from "@tanstack/react-router";

import { confirmEmail } from "@/utils/auth";

function parseSearch(search: Record<string, unknown>) {
  return { code: typeof search.code === "string" ? search.code : "" };
}

export const Route = createFileRoute("/auth/callback")({
  validateSearch: parseSearch,
  beforeLoad: async ({ search }) => {
    if (search.code === "") {
      throw redirect({ href: "/login?confirmation=invalid" });
    }

    const result = await confirmEmail({ data: { code: search.code } });
    if (result.status === "error") {
      throw redirect({ href: "/login?confirmation=invalid" });
    }

    throw redirect({
      href: result.identityVerified ? "/dashboard" : "/?onboarding=verify",
    });
  },
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  return <main>Confirming your account…</main>;
}
