import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

const defaultUserId = import.meta.env.PUBLIC_DEFAULT_USER_ID;

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For development purposes, always return mock user
    setUser({
      id: defaultUserId,
      email: "developer@example.com",
      created_at: "2025-10-17T09:43:35.926966+00:00",
      confirmed_at: "2025-10-17T09:43:35.934705+00:00",
      last_sign_in_at: undefined,
      phone: undefined,
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
      user_metadata: {
        email_verified: true,
      },
      updated_at: "2025-10-17T09:43:35.935357+00:00",
      confirmation_sent_at: undefined,
      is_anonymous: false,
      is_sso_user: false,
      invited_at: undefined,
      aud: "authenticated",
    });
    setLoading(false);
  }, []);

  return { user, loading };
}
