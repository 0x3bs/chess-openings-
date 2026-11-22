"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LocaleLink as Link } from "./LocaleLink";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";

export function AccountMenu() {
  const { m } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setReady(true);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!supabaseConfigured || !ready || !user) {
    return (
      <Link href="/login" className="nav-cta">
        {m.nav.signIn}
      </Link>
    );
  }

  const initial = user.email?.slice(0, 1).toUpperCase() ?? "A";

  return (
    <div className="account-menu">
      <Link
        href="/login"
        className="account-chip"
        title={user.email ?? m.login.yourAccount}
      >
        <span className="account-avatar" aria-hidden>
          {initial}
        </span>
        <span className="account-email">{user.email}</span>
      </Link>
      <button
        type="button"
        className="account-signout"
        onClick={() => void supabase?.auth.signOut()}
      >
        {m.nav.signOut}
      </button>
    </div>
  );
}
