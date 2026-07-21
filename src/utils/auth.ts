import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

import { createSupabaseServerClient } from "./supabase.server";

function getApplicationOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (configuredOrigin) {
    const parsedOrigin = new URL(configuredOrigin);
    const isLocalOrigin = ["localhost", "127.0.0.1", "[::1]"].includes(
      parsedOrigin.hostname,
    );
    if (parsedOrigin.protocol !== "https:" && !(parsedOrigin.protocol === "http:" && isLocalOrigin)) {
      throw new Error("APP_ORIGIN must use HTTPS outside local development.");
    }
    return parsedOrigin.origin;
  }

  const requestUrl = new URL(getRequestUrl());
  if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") {
    return requestUrl.origin;
  }

  throw new Error("APP_ORIGIN is required outside local development.");
}

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

type VerificationInput = {
  publicFirstName: string;
  publicLastName: string | null;
};

type PublicProfileInput = { memberId: string };

type ProfilePictureInput = { path: string | null };

type VerificationResult =
  | { status: "verified" }
  | { status: "authentication-required" }
  | { status: "error" };

type PublicMemberProfile = {
  memberId: string;
  publicFirstName: string;
  publicLastInitial: string | null;
  profilePicturePath: string | null;
  identityVerified: boolean;
  successfulHandoverCount: number;
  transactionPartnerCount: number;
  buyerTier: "verified_buyer" | "reliable_buyer" | "trusted_buyer";
  available: boolean;
};

type CurrentMemberBase = {
  id: string;
  email: string;
  profilePicturePath: string | null;
  successfulHandoverCount: number;
  transactionPartnerCount: number;
  buyerTier: "verified_buyer" | "reliable_buyer" | "trusted_buyer";
  restricted: boolean;
};

type CurrentMember =
  | (CurrentMemberBase & {
      identityVerified: false;
      publicFirstName: null;
      publicLastInitial: null;
    })
  | (CurrentMemberBase & {
      identityVerified: true;
      publicFirstName: string;
      publicLastInitial: string | null;
    });

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

function parseVerificationInput(input: unknown): VerificationInput {
  if (
    typeof input !== "object" ||
    input === null ||
    !("publicFirstName" in input) ||
    typeof input.publicFirstName !== "string"
  ) {
    throw new Error("Public first name is required.");
  }

  const publicFirstName = input.publicFirstName.trim();
  const publicLastName =
    "publicLastName" in input && typeof input.publicLastName === "string"
      ? input.publicLastName.trim()
      : "";

  if (publicFirstName.length === 0 || publicFirstName.length > 50 || publicLastName.length > 100) {
    throw new Error("Enter a valid Public Identity name.");
  }

  return {
    publicFirstName,
    publicLastName: publicLastName.length === 0 ? null : publicLastName,
  };
}

function parsePublicProfileInput(input: unknown): PublicProfileInput {
  if (
    typeof input !== "object" ||
    input === null ||
    !("memberId" in input) ||
    typeof input.memberId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.memberId,
    )
  ) {
    throw new Error("Valid member ID is required.");
  }

  return { memberId: input.memberId };
}

function parseProfilePictureInput(input: unknown): ProfilePictureInput {
  if (typeof input !== "object" || input === null || !("path" in input)) {
    throw new Error("Profile picture path is required.");
  }

  if (input.path === null) return { path: null };
  if (typeof input.path !== "string" || input.path.trim() === "") {
    throw new Error("Profile picture path is invalid.");
  }

  return { path: input.path.trim() };
}

async function loadCurrentProfile(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const { data, error } = await supabase.rpc("get_current_member_profile").maybeSingle();

  if (error || data === null) {
    throw new Error("Authenticated member profile is unavailable.");
  }

  return data;
}

export const registerAccount = createServerFn({ method: "POST" })
  .validator(parseCredentials)
  .handler(async ({ data }): Promise<RegisterResult> => {
    const supabase = createSupabaseServerClient();
    const callbackUrl = new URL("/auth/callback", getApplicationOrigin()).toString();
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
    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      return { status: "error", message: "Email or password is incorrect." };
    }

    const profile = await loadCurrentProfile(supabase);

    return {
      status: "authenticated",
      identityVerified: profile.identity_verification_status === "simulated_verified",
    };
  });

export const startGoogleSignIn = createServerFn({ method: "POST" }).handler(
  async (): Promise<OAuthStartResult> => {
    const supabase = createSupabaseServerClient();
    const callbackUrl = new URL("/auth/callback", getApplicationOrigin()).toString();
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

export const getCurrentMember = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentMember | null> => {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || data.user === null) return null;

    const profile = await loadCurrentProfile(supabase);

    const currentMember = {
      id: data.user.id,
      email: data.user.email ?? "",
      profilePicturePath: profile.profile_picture_path,
      successfulHandoverCount: profile.successful_handover_count,
      transactionPartnerCount: profile.transaction_partner_count,
      buyerTier: profile.buyer_tier,
      restricted: profile.is_restricted,
    };

    if (profile.identity_verification_status === "unverified") {
      return {
        ...currentMember,
        identityVerified: false,
        publicFirstName: null,
        publicLastInitial: null,
      };
    }

    if (profile.public_first_name === null) {
      throw new Error("Verified member Public Identity is incomplete.");
    }

    return {
      ...currentMember,
      identityVerified: true,
      publicFirstName: profile.public_first_name,
      publicLastInitial: profile.public_last_initial,
    };
  },
);

export const confirmEmail = createServerFn({ method: "POST" })
  .validator(parseCallbackInput)
  .handler(async ({ data }): Promise<OAuthCallbackResult> => {
    const supabase = createSupabaseServerClient();
    const { data: callback, error } = await supabase.auth.exchangeCodeForSession(data.code);

    if (error || callback.user === null) return { status: "error" };

    const profile = await loadCurrentProfile(supabase);

    return {
      status: "authenticated",
      identityVerified: profile.identity_verification_status === "simulated_verified",
    };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return { ok: error === null };
});

export const completeSimulatedIdentityVerification = createServerFn({ method: "POST" })
  .validator(parseVerificationInput)
  .handler(async ({ data }): Promise<VerificationResult> => {
    const supabase = createSupabaseServerClient();
    const { data: current, error: currentError } = await supabase.auth.getUser();

    if (currentError || current.user === null) {
      return { status: "authentication-required" };
    }

    const { error } = await supabase.rpc("complete_simulated_identity_verification", {
      public_first_name: data.publicFirstName,
      public_last_name: data.publicLastName,
    });

    return error === null
      ? { status: "verified" }
      : { status: "error" };
  });

export const getPublicMemberProfile = createServerFn({ method: "GET" })
  .validator(parsePublicProfileInput)
  .handler(async ({ data }): Promise<PublicMemberProfile | null> => {
    const supabase = createSupabaseServerClient();
    const { data: profile, error } = await supabase
      .rpc("get_public_member_profile", { target_member_id: data.memberId })
      .maybeSingle();

    if (error) throw new Error("Public member profile is unavailable.");
    if (profile === null) return null;
    if (profile.public_first_name === null) {
      throw new Error("Public Identity is incomplete.");
    }

    return {
      memberId: profile.member_id,
      publicFirstName: profile.public_first_name,
      publicLastInitial: profile.public_last_initial,
      profilePicturePath: profile.profile_picture_path,
      identityVerified: profile.identity_verified,
      successfulHandoverCount: profile.successful_handover_count,
      transactionPartnerCount: profile.transaction_partner_count,
      buyerTier: profile.buyer_tier,
      available: profile.available,
    };
  });

export const updateCurrentProfilePicture = createServerFn({ method: "POST" })
  .validator(parseProfilePictureInput)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("update_current_member_profile", {
      profile_picture_path: data.path,
    });

    return { ok: error === null };
  });
