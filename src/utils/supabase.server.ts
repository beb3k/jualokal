import { createServerClient } from "@supabase/ssr";
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";

export type IdentityVerificationStatus = "unverified" | "simulated_verified";
export type BuyerTier = "verified_buyer" | "reliable_buyer" | "trusted_buyer";

type MemberProfileRow = {
  member_id: string;
  public_first_name: string | null;
  public_last_initial: string | null;
  profile_picture_path: string | null;
  identity_verification_status: IdentityVerificationStatus;
  identity_verified_at: string | null;
  verification_provider_reference: string | null;
  successful_handover_count: number;
  transaction_partner_count: number;
  buyer_tier: BuyerTier;
  is_restricted: boolean;
  created_at: string;
  updated_at: string;
};

type PublicMemberProfileRow = {
  member_id: string;
  public_first_name: string | null;
  public_last_initial: string | null;
  profile_picture_path: string | null;
  identity_verified: boolean;
  successful_handover_count: number;
  transaction_partner_count: number;
  buyer_tier: BuyerTier;
  available: boolean;
};

type JualokalDatabase = {
  public: {
    Tables: {
      member_profiles: {
        Row: MemberProfileRow;
        Insert: {
          member_id: string;
          public_first_name?: string | null;
          public_last_initial?: string | null;
          profile_picture_path?: string | null;
          identity_verification_status?: IdentityVerificationStatus;
          identity_verified_at?: string | null;
          verification_provider_reference?: string | null;
          successful_handover_count?: number;
          transaction_partner_count?: number;
          buyer_tier?: BuyerTier;
          is_restricted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          public_first_name?: string | null;
          public_last_initial?: string | null;
          profile_picture_path?: string | null;
          identity_verification_status?: IdentityVerificationStatus;
          identity_verified_at?: string | null;
          verification_provider_reference?: string | null;
          successful_handover_count?: number;
          transaction_partner_count?: number;
          buyer_tier?: BuyerTier;
          is_restricted?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_simulated_identity_verification: {
        Args: { public_first_name: string; public_last_name?: string | null };
        Returns: undefined;
      };
      get_current_member_profile: {
        Args: Record<string, never>;
        Returns: MemberProfileRow[];
      };
      get_public_member_profile: {
        Args: { target_member_id: string };
        Returns: PublicMemberProfileRow[];
      };
      update_current_member_profile: {
        Args: { profile_picture_path: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      buyer_tier: BuyerTier;
      identity_verification_status: IdentityVerificationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

function requirePublicEnvironmentValue(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createSupabaseServerClient() {
  const url = requirePublicEnvironmentValue(
    "VITE_SUPABASE_URL",
    import.meta.env.VITE_SUPABASE_URL,
  );
  const key = requirePublicEnvironmentValue(
    "VITE_SUPABASE_KEY",
    import.meta.env.VITE_SUPABASE_KEY,
  );

  return createServerClient<JualokalDatabase>(url, key, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies, headers) {
        for (const cookie of cookies) {
          setCookie(cookie.name, cookie.value, cookie.options);
        }
        for (const [name, value] of Object.entries(headers)) {
          setResponseHeader(name, value);
        }
      },
    },
  });
}
