import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { Timestamp } from "firebase-admin/firestore";

import { firebaseEmulatorHosts, getFirebaseProjectId, useFirebaseEmulators } from "./firebase-config";

export type IdentityVerificationStatus = "unverified" | "simulated_verified";
export type BuyerTier = "verified_buyer" | "reliable_buyer" | "trusted_buyer";

// Firestore document `member_profiles/{memberId}`. Field names mirror the former
// Postgres table so the privacy boundaries stay easy to compare.
export type MemberProfile = {
  member_id: string;
  public_first_name: string | null;
  public_last_initial: string | null;
  profile_picture_path: string | null;
  identity_verification_status: IdentityVerificationStatus;
  identity_verified_at: Timestamp | null;
  verification_provider_reference: string | null;
  successful_handover_count: number;
  transaction_partner_count: number;
  buyer_tier: BuyerTier;
  is_restricted: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export const MEMBER_PROFILES = "member_profiles";

function getAdminApp() {
  if (useFirebaseEmulators) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= firebaseEmulatorHosts.auth;
    process.env.FIRESTORE_EMULATOR_HOST ??= firebaseEmulatorHosts.firestore;
  }
  // Outside the emulators the Admin SDK uses Application Default Credentials.
  return getApps()[0] ?? initializeApp({ projectId: getFirebaseProjectId() });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function memberProfileRef(memberId: string) {
  return getAdminFirestore().collection(MEMBER_PROFILES).doc(memberId);
}

// Replaces the former `create_member_profile` signup trigger: every
// authenticated member gets an unverified profile on first use.
export async function loadOrCreateMemberProfile(memberId: string): Promise<MemberProfile> {
  const ref = memberProfileRef(memberId);
  await getAdminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return;
    transaction.create(ref, {
      member_id: memberId,
      public_first_name: null,
      public_last_initial: null,
      profile_picture_path: null,
      identity_verification_status: "unverified",
      identity_verified_at: null,
      verification_provider_reference: null,
      successful_handover_count: 0,
      transaction_partner_count: 0,
      buyer_tier: "verified_buyer",
      is_restricted: false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  const snapshot = await ref.get();
  const profile = snapshot.data() as MemberProfile | undefined;
  if (profile === undefined) throw new Error("Authenticated member profile is unavailable.");
  return profile;
}
