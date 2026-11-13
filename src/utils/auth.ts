import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminFirestore,
  loadOrCreateMemberProfile,
  memberProfileRef,
} from "./firebase.server";
import type { BuyerTier, MemberProfile } from "./firebase.server";

const SESSION_COOKIE = "__session";
const SESSION_LIFETIME_MS = 5 * 24 * 60 * 60 * 1000;
const RECENT_SIGN_IN_SECONDS = 5 * 60;

type SessionInput = { idToken: string };

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
  buyerTier: BuyerTier;
  available: boolean;
};

type CurrentMemberBase = {
  id: string;
  email: string;
  profilePicturePath: string | null;
  successfulHandoverCount: number;
  transactionPartnerCount: number;
  buyerTier: BuyerTier;
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

function parseSessionInput(input: unknown): SessionInput {
  if (
    typeof input !== "object" ||
    input === null ||
    !("idToken" in input) ||
    typeof input.idToken !== "string" ||
    input.idToken.trim() === "" ||
    input.idToken.length > 8192
  ) {
    throw new Error("A Firebase ID token is required.");
  }

  return { idToken: input.idToken };
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
    !/^[A-Za-z0-9]{1,128}$/.test(input.memberId)
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

function isSecureRequest() {
  return new URL(getRequestUrl()).protocol === "https:";
}

// Returns the signed-in member's Firebase user, or null when the session cookie
// is missing, expired, or revoked by sign-out.
async function getSessionUser() {
  const sessionCookie = getCookie(SESSION_COOKIE);
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return { id: decoded.uid, email: decoded.email ?? "" };
  } catch {
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return null;
  }
}

export const createSession = createServerFn({ method: "POST" })
  .validator(parseSessionInput)
  .handler(async ({ data }) => {
    const auth = getAdminAuth();

    try {
      const decoded = await auth.verifyIdToken(data.idToken, true);
      if (Date.now() / 1000 - decoded.auth_time > RECENT_SIGN_IN_SECONDS) {
        return { ok: false };
      }

      const sessionCookie = await auth.createSessionCookie(data.idToken, {
        expiresIn: SESSION_LIFETIME_MS,
      });
      await loadOrCreateMemberProfile(decoded.uid);

      setCookie(SESSION_COOKIE, sessionCookie, {
        httpOnly: true,
        maxAge: SESSION_LIFETIME_MS / 1000,
        path: "/",
        sameSite: "lax",
        secure: isSecureRequest(),
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const getCurrentMember = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentMember | null> => {
    const user = await getSessionUser();
    if (user === null) return null;

    const profile = await loadOrCreateMemberProfile(user.id);

    const currentMember = {
      id: user.id,
      email: user.email,
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

// Ends every session for this member, matching the previous global sign-out.
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const user = await getSessionUser();
  deleteCookie(SESSION_COOKIE, { path: "/" });
  if (user === null) return { ok: true };

  try {
    await getAdminAuth().revokeRefreshTokens(user.id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

export const completeSimulatedIdentityVerification = createServerFn({ method: "POST" })
  .validator(parseVerificationInput)
  .handler(async ({ data }): Promise<VerificationResult> => {
    const user = await getSessionUser();
    if (user === null) return { status: "authentication-required" };

    const ref = memberProfileRef(user.id);
    try {
      await getAdminFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const profile = snapshot.data() as MemberProfile | undefined;
        if (profile?.identity_verification_status !== "unverified") {
          throw new Error("Unverified member profile not found.");
        }

        transaction.update(ref, {
          public_first_name: data.publicFirstName,
          public_last_initial:
            data.publicLastName === null ? null : data.publicLastName.charAt(0).toUpperCase(),
          identity_verification_status: "simulated_verified",
          identity_verified_at: FieldValue.serverTimestamp(),
          verification_provider_reference: `simulation/${user.id}`,
          updated_at: FieldValue.serverTimestamp(),
        });
      });
      return { status: "verified" };
    } catch {
      return { status: "error" };
    }
  });

export const getPublicMemberProfile = createServerFn({ method: "GET" })
  .validator(parsePublicProfileInput)
  .handler(async ({ data }): Promise<PublicMemberProfile | null> => {
    const user = await getSessionUser();
    if (user === null) return null;

    const [requesterSnapshot, targetSnapshot] = await Promise.all([
      memberProfileRef(user.id).get(),
      memberProfileRef(data.memberId).get(),
    ]);
    const requester = requesterSnapshot.data() as MemberProfile | undefined;
    const profile = targetSnapshot.data() as MemberProfile | undefined;

    if (
      requester?.identity_verification_status !== "simulated_verified" ||
      requester.is_restricted ||
      profile?.identity_verification_status !== "simulated_verified"
    ) {
      return null;
    }

    if (profile.public_first_name === null) {
      throw new Error("Public Identity is incomplete.");
    }

    return {
      memberId: profile.member_id,
      publicFirstName: profile.public_first_name,
      publicLastInitial: profile.public_last_initial,
      profilePicturePath: profile.profile_picture_path,
      identityVerified: true,
      successfulHandoverCount: profile.successful_handover_count,
      transactionPartnerCount: profile.transaction_partner_count,
      buyerTier: profile.buyer_tier,
      available: !profile.is_restricted,
    };
  });

export const updateCurrentProfilePicture = createServerFn({ method: "POST" })
  .validator(parseProfilePictureInput)
  .handler(async ({ data }) => {
    const user = await getSessionUser();
    if (user === null) return { ok: false };
    if (data.path !== null && !data.path.startsWith(`${user.id}/`)) return { ok: false };

    try {
      await memberProfileRef(user.id).update({
        profile_picture_path: data.path,
        updated_at: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
