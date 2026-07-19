import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

import { createSupabaseServerClient } from "./supabase.server";

type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterResult =
  | { status: "authenticated" }
  | { status: "confirmation-required" }
  | { status: "error"; message: string };

type SignInResult =
  | { status: "authenticated"; identityVerified: boolean }
  | { status: "error"; message: string };

type OAuthStartResult =
  | { status: "redirect"; url: string }
  | { status: "error"; message: string };

type OAuthCallbackResult =
  | { status: "authenticated"; identityVerified: boolean }
  | { status: "error" };

type CallbackInput = { code: string };

type VerificationResult =
  | { status: "verified" }
  | { status: "authentication-required" }
  | { status: "error" };

function parseCredentials(input: unknown): AuthCredentials {
  if (
    typeof input !== "object" ||
    input === null ||
    !("email" in input) ||
    !("password" in input) ||
    typeof input.email !== "string" ||
    typeof input.password !== "string"
  ) {
    throw new Error("Email and password are required.");
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) {
    throw new Error("Enter a valid email and a password of at least 8 characters.");
  }

  return { email, password: input.password };
}

function parseCallbackInput(input: unknown): CallbackInput {
  if (
    typeof input !== "object" ||
    input === null ||
    !("code" in input) ||
    typeof input.code !== "string" ||
    input.code.trim() === ""
  ) {
    throw new Error("Confirmation code is required.");
  }

  return { code: input.code };
}

function hasSimulatedIdentityVerification(metadata: unknown): boolean {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "identity_verification" in metadata &&
    metadata.identity_verification === "simulated"
  );
}

export const registerAccount = createServerFn({ method: "POST" })
  .validator(parseCredentials)
  .handler(async ({ data }): Promise<RegisterResult> => {
    const supabase = createSupabaseServerClient();
    const callbackUrl = new URL("/auth/callback", getRequestUrl()).toString();
    const { data: signup, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      return {
        status: "error",
        message: "Account creation failed. Check your details or try signing in.",
      };
    }

    if (signup.session === null) {
      return { status: "confirmation-required" };
    }

    return { status: "authenticated" };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(parseCredentials)
  .handler(async ({ data }): Promise<SignInResult> => {
    const supabase = createSupabaseServerClient();
    const { data: login, error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      return { status: "error", message: "Email or password is incorrect." };
    }

    return {
      status: "authenticated",
      identityVerified: hasSimulatedIdentityVerification(login.user.user_metadata),
    };
  });

export const startGoogleSignIn = createServerFn({ method: "POST" }).handler(
  async (): Promise<OAuthStartResult> => {
    const supabase = createSupabaseServerClient();
    const callbackUrl = new URL("/auth/callback", getRequestUrl()).toString();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || data.url === null) {
      return {
        status: "error",
        message: "Google sign-in is unavailable. Use email and password instead.",
      };
    }

    return { status: "redirect", url: data.url };
  },
);

export const getCurrentMember = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || data.user === null) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    identityVerified: hasSimulatedIdentityVerification(data.user.user_metadata),
  };
});

export const confirmEmail = createServerFn({ method: "POST" })
  .validator(parseCallbackInput)
  .handler(async ({ data }): Promise<OAuthCallbackResult> => {
    const supabase = createSupabaseServerClient();
    const { data: callback, error } = await supabase.auth.exchangeCodeForSession(data.code);

    if (error || callback.user === null) return { status: "error" };

    return {
      status: "authenticated",
      identityVerified: hasSimulatedIdentityVerification(callback.user.user_metadata),
    };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return { ok: error === null };
});

export const completeSimulatedIdentityVerification = createServerFn({ method: "POST" }).handler(
  async (): Promise<VerificationResult> => {
    const supabase = createSupabaseServerClient();
    const { data: current, error: currentError } = await supabase.auth.getUser();

    if (currentError || current.user === null) {
      return { status: "authentication-required" };
    }

    const { error } = await supabase.auth.updateUser({
      data: { identity_verification: "simulated" },
    });

    return error === null
      ? { status: "verified" }
      : { status: "error" };
  },
);
