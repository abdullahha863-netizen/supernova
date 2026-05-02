"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const referralCode = useMemo(() => String(searchParams.get("ref") || "").trim(), [searchParams]);
  const nextPath = useMemo(() => getSafeNextPath(searchParams.get("next")), [searchParams]);

  const ambientDots = useMemo(
    () =>
      isClient
        ? Array.from({ length: 200 }, () => ({
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
        ? Array.from({ length: 150 }, () => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 5,
          }))
        : [],
    [isClient]
  );

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });

    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: referralCode || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Registration failed");
      }

      setStatus({ type: "success", message: "Account created successfully. Redirecting..." });
      router.push(nextPath);
      return;
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
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
            <h1 className="text-3xl font-bold text-[#C9EB55]">Create Your SUPERNOVA Account</h1>
            <p className="text-white/70 text-sm">Secure onboarding for your member dashboard.</p>
          </div>

          {referralCode ? (
            <div className="mb-4 rounded-lg border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-xs text-[#d7f56c]">
              Referral code detected: <span className="font-semibold">{referralCode}</span>
            </div>
          ) : null}

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <Input
              id="name"
              label="Full name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              id="email"
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              id="confirm"
              label="Confirm password"
              name="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <p className="text-xs text-white/55 -mt-2">Use a strong password with at least 8 characters.</p>

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
              {loading ? "Creating..." : "Create account"}
            </Button>

            <p className="text-xs text-white/50 text-center -mt-2">Your account details are handled through protected registration flow.</p>

            <FormFooter>
              <div className="text-sm">
                <span className="text-white/50">Already have an account? </span>
                <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-[#C9EB55] hover:underline">
                  Login
                </Link>
              </div>
            </FormFooter>
          </form>
        </div>
      </div>

      <SupernovaFooter className="relative z-10 pb-10" />
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Loading register...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
