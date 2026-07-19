import { Link, useNavigate } from "@tanstack/react-router";
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
import { signIn, startGoogleSignIn } from "@/utils/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setHydrated(true), []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
      setError("Email and password are required.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await signIn({ data: { email, password } });
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      await navigate({ to: "/dashboard" });
    } catch {
      setError("Sign in is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGoogleLogin() {
    setError(null);
    setGoogleSubmitting(true);

    try {
      const result = await startGoogleSignIn();
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Google sign-in is temporarily unavailable. Try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <Card className="w-full border-primary/10 shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="font-serif text-2xl tracking-tight">Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage listings and nearby handovers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          disabled={!hydrated || googleSubmitting || submitting}
          onClick={submitGoogleLogin}
          type="button"
          variant="outline"
        >
          <span aria-hidden="true" className="font-bold text-[#4285f4]">
            G
          </span>
          {googleSubmitting ? "Opening Google…" : "Continue with Google"}
        </Button>
        <div className="my-5 flex items-center gap-3" role="separator">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or use email</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form className="grid gap-5" onSubmit={submitLogin}>
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
              autoComplete="current-password"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          {error === null ? null : (
            <p aria-live="polite" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            className="w-full"
            disabled={!hydrated || googleSubmitting || submitting}
            type="submit"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Jualokal?{" "}
          <Link className="font-medium text-primary hover:underline" to="/register">
            Begin registration
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
