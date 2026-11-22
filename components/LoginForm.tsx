"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { LocaleLink as Link } from "./LocaleLink";
import { localePath } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { syncAllProgress } from "@/lib/supabase/sync";

const CODE_TOKENS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "supabase/schema.sql",
  ".env.local",
  "supabase.com",
];

function SetupText({ text }: { text: string }) {
  const pattern = new RegExp(
    `(${CODE_TOKENS.map((token) =>
      token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ).join("|")})`,
    "g",
  );
  return (
    <>
      {text.split(pattern).map((part, index) =>
        CODE_TOKENS.includes(part) ? (
          <code key={index}>{part}</code>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function LoginForm() {
  const { locale, m } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "ok";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
      if (data.user) void syncAllProgress();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) void syncAllProgress();
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${
              process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
            }${localePath(locale, "/login")}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          await syncAllProgress();
          setMessage({ kind: "ok", text: m.login.accountCreatedSynced });
        } else {
          setMessage({ kind: "ok", text: m.login.accountCreatedConfirm });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await syncAllProgress();
        setMessage({ kind: "ok", text: m.login.signedInMerged });
      }
      setPassword("");
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : m.login.somethingWrong,
      });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage({ kind: "ok", text: m.login.signedOut });
  }

  if (!supabaseConfigured) {
    return (
      <main className="page">
        <div className="auth-card">
          <p className="eyebrow">{m.login.eyebrow}</p>
          <h1>{m.login.configuredTitle}</h1>
          <p>{m.login.configuredText}</p>
          <div className="auth-note">
            <strong>{m.login.setupStrong}</strong>{" "}
            <SetupText text={m.login.setupText} />
          </div>
          <div className="page-actions">
            <Link href="/openings" className="btn btn-primary">
              {m.login.continueLocal}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="auth-card">
        <p className="eyebrow">{m.login.eyebrow}</p>
        <h1>
          {user
            ? m.login.yourAccount
            : mode === "signin"
              ? m.login.signIn
              : m.login.createAccount}
        </h1>
        <p>{m.login.lead}</p>

        {user ? (
          <>
            <p className="auth-message is-ok">
              {m.login.signedInAs.replace("{email}", user.email ?? "")}
            </p>
            <div className="page-actions">
              <Link href="/openings" className="btn btn-primary">
                {m.login.goToCourses}
              </Link>
              <button type="button" className="danger-btn" onClick={signOut}>
                {m.login.signOut}
              </button>
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">{m.login.email}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">{m.login.password}</label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy
                ? m.login.working
                : mode === "signin"
                  ? m.login.signIn
                  : m.login.createAccount}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMode((value) =>
                  value === "signin" ? "signup" : "signin",
                );
                setMessage(null);
              }}
            >
              {mode === "signin"
                ? m.login.noAccount
                : m.login.haveAccount}
            </button>
          </form>
        )}

        {message ? (
          <p
            className={`auth-message ${message.kind === "error" ? "is-error" : "is-ok"}`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </main>
  );
}
