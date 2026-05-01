"use client";

import { Suspense, useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormFooter from "@/components/auth/FormFooter";
import SupernovaFooter from "@/components/SupernovaFooter";
import AuthAmbientBackground from "@/components/auth/AuthAmbientBackground";

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return "/dashboard";
  return rawNext;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  const nextPath = useMemo(() => getSafeNextPath(searchParams.get("next")), [searchParams]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });
    setLoading(true);

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[login/page] submitted email:", String(email).trim().toLowerCase());
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[login/page] API error returned:", data?.error || "Sign in failed");
        }
        throw new Error(data?.error || "Sign in failed");
      }

      if (data?.twoFactor && data?.challengeToken) {
        const twoFactorType = data?.twoFactorType === "email" ? "email" : "totp";
        router.push(
          `/2fa?challenge=${encodeURIComponent(data.challengeToken)}&type=${encodeURIComponent(twoFactorType)}&next=${encodeURIComponent(nextPath)}`
        );
        return;
      }

      setStatus({ type: "success", message: "Signed in successfully." });
      window.location.assign(nextPath);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative -mt-4 min-h-screen overflow-hidden pt-4 text-white md:-mt-6 md:pt-6">
      <AuthAmbientBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="nova-glow rounded-2xl p-7 md:p-8 w-full max-w-lg relative overflow-hidden">
          <div className="space-y-1 mb-6">
            <h1 className="text-3xl font-bold text-[#C9EB55]">SUPERNOVA</h1>
            <p className="text-white/70 text-sm">Secure Member Access</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <Input
              id="email"
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              id="password"
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between gap-3">
              <Link href="/forgot-password" className="text-sm text-white/60 hover:underline">
                Forgot password?
              </Link>
              <p className="text-xs text-white/45">Protected sign-in flow</p>
            </div>

            {status.type && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  status.type === "success"
                    ? "border-[#C9EB55]/35 bg-[#C9EB55]/10 text-[#d7f56c]"
                    : "border-red-500/35 bg-red-500/10 text-red-300"
                }`}
                role="status"
                aria-live="polite"
              >
                {status.message}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <FormFooter>
              <span className="text-white/50">
                Don&apos;t have an account?{" "}
                <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="text-[#C9EB55] hover:underline">
                  Create one
                </Link>
              </span>
            </FormFooter>
          </form>
        </div>
      </div>

      <SupernovaFooter className="relative z-10 pb-10" />
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
