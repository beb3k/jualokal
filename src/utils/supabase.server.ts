import { createServerClient } from "@supabase/ssr";
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";

type JualokalDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
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
