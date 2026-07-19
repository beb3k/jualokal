import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { RegisterForm } from "@/components/register-form";
import { getCurrentMember } from "@/utils/auth";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const member = await getCurrentMember();
    if (member !== null) throw redirect({ to: "/dashboard" });
  },
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex flex-col p-6 sm:p-10">
        <Link className="brand" to="/">
          <span aria-hidden="true" className="brand-mark">J</span>
          jualokal
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 items-center py-12">
          <RegisterForm />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Marketplace access remains private until verification is complete.
        </p>
      </section>
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/15" />
        <div className="absolute -right-4 top-16 size-56 rounded-full border border-dashed border-white/20" />
        <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
          Accountable access
        </p>
        <blockquote className="relative max-w-lg font-serif text-4xl leading-tight tracking-tight">
          “Join your nearby marketplace without making the neighbourhood public.”
        </blockquote>
        <p className="relative max-w-md text-sm leading-6 text-white/65">
          Account registration starts here. Listings, member details, and precise locations
          remain private.
        </p>
      </aside>
    </main>
  );
}
