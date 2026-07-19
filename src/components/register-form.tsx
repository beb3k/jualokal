import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAccount } from "@/utils/auth";

type RegistrationState =
  | { status: "editing" }
  | { status: "confirmation-required"; email: string };

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [registration, setRegistration] = useState<RegistrationState>({
    status: "editing",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setHydrated(true), []);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const passwordConfirmation = form.get("password-confirmation");

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof passwordConfirmation !== "string"
    ) {
      setError("Email and password are required.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await registerAccount({ data: { email, password } });
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      if (result.status === "confirmation-required") {
        setRegistration({ status: "confirmation-required", email });
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Registration is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (registration.status === "confirmation-required") {
    return (
      <Card className="w-full border-primary/10 shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="font-serif text-2xl tracking-tight">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to {registration.email}. Open it to finish creating
            your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Do not send identity documents, selfies, biometrics, or payment information.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Already confirmed? Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-primary/10 shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="font-serif text-2xl tracking-tight">Create your account</CardTitle>
        <CardDescription>
          Register before completing the simulated identity verification walkthrough.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={submitRegistration}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete="new-password"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password-confirmation">Confirm password</Label>
            <Input
              autoComplete="new-password"
              id="password-confirmation"
              minLength={8}
              name="password-confirmation"
              required
              type="password"
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Identity verification remains simulated. Never upload identity documents,
            selfies, or biometrics.
          </p>
          {error === null ? null : (
            <p aria-live="polite" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={!hydrated || submitting} type="submit">
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
