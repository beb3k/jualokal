import { createFileRoute, Link } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex flex-col p-6 sm:p-10">
        <Link className="inline-flex w-fit items-center gap-2 font-bold tracking-tight text-primary" to="/">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-serif text-lg text-primary-foreground">
            J
          </span>
          jualokal
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 items-center py-12">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Marketplace access remains private to verified members.
        </p>
      </section>
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/15" />
        <div className="absolute -right-4 top-16 size-56 rounded-full border border-dashed border-white/20" />
        <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
          Private by design
        </p>
        <blockquote className="relative max-w-lg font-serif text-4xl leading-tight tracking-tight">
          “Nearby exchange works better when trust comes before access.”
        </blockquote>
        <p className="relative max-w-md text-sm leading-6 text-white/65">
          Listings, locations, and member details stay behind accountable access.
        </p>
      </aside>
    </main>
  );
}
