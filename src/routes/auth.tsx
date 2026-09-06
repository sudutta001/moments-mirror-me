import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { WinButton, WinInput, WinWindow } from "@/lib/win";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Log On — Instagram.exe" },
      {
        name: "description",
        content:
          "Sign in or create an account to save your retro Instagram profile, posts, followers and following across devices.",
      },
      { property: "og:title", content: "Log On — Instagram.exe" },
      {
        property: "og:description",
        content: "Sign in to save your retro Instagram profile and posts across devices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim().replace(/^@/, "") },
          },
        });
        if (error) throw error;
        if (!data.session) setMsg("Check your email to confirm your account, then log on.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-win-ink p-3 font-win text-win-ink"
      style={{ fontFamily: "var(--font-win)" }}
    >
      <div className="w-full max-w-[380px]">
        <WinWindow title="Log On to Instagram.exe">
          <form onSubmit={submit} className="space-y-3 p-4">
            <h1 className="text-[15px] font-bold">
              {mode === "in" ? "Enter your password" : "Create an account"}
            </h1>
            {mode === "up" && (
              <WinInput
                label="Username"
                value={username}
                maxLength={30}
                required
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
            <WinInput
              label="Email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
            <WinInput
              label="Password"
              type="password"
              value={password}
              required
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
            />
            {msg && <p className="text-[12px] leading-snug">{msg}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <WinButton type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "in" ? "OK" : "Sign up"}
              </WinButton>
              <WinButton type="button" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "New user" : "Have an account"}
              </WinButton>
            </div>
            <div className="border-t-2 border-[var(--win-face-dark)] pt-3">
              <WinButton type="button" onClick={google} className="w-full py-2">
                Continue with Google
              </WinButton>
            </div>
          </form>
        </WinWindow>
      </div>
    </main>
  );
}
