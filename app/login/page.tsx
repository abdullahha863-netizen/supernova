"use client";

import { Suspense, useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormFooter from "@/components/auth/FormFooter";
import { motion } from "framer-motion";
import SupernovaFooter from "@/components/SupernovaFooter";

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
  const [isClient, setIsClient] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const ambientDots = useMemo(
    () =>
      isClient
        ? Array.from({ length: 56 }, () => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: Math.random() * 8 + 5,
            delay: Math.random() * 8,
          }))
        : [],
    [isClient]
  );

  const ambientStars = useMemo(
    () =>
      isClient
        ? Array.from({ length: 44 }, () => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 5,
          }))
        : [],
    [isClient]
  );

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
    <div className="relative -mt-4 min-h-screen overflow-hidden bg-[#0A0A0F] pt-4 text-white md:-mt-6 md:pt-6">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {isClient && (
          <>
            {ambientDots.map((dot, i) => (
              <motion.div
                key={i}
                className="absolute w-[2px] h-[2px] bg-[#C9EB55]/40 rounded-full"
                style={{
                  left: dot.left,
                  top: dot.top,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: dot.duration,
                  repeat: Infinity,
                  delay: dot.delay,
                  ease: "easeInOut",
                }}
              />
            ))}

            {ambientStars.map((star, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-[1px] h-[1px] bg-white rounded-full"
                style={{
                  left: star.left,
                  top: star.top,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: star.duration,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </div>

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
