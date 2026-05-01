"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormFooter from "@/components/auth/FormFooter";
import SupernovaFooter from "@/components/SupernovaFooter";
import AuthAmbientBackground from "@/components/auth/AuthAmbientBackground";

type Status = {
  type: "idle" | "success" | "error";
  message: string;
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!emailOk) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setStatus({
          type: "error",
          message:
            data?.error === "Rate limit"
              ? "Too many attempts. Wait a few minutes and try again."
              : "We could not send the reset link right now. Try again shortly.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "If that email exists, a reset link has been sent. Check your inbox and spam folder.",
      });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Network error. Check your connection and try again." });
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
            <h1 className="text-3xl font-bold text-[#C9EB55]">Forgot password</h1>
            <p className="text-white/70 text-sm">We will send you a reset link</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <Input
              id="email"
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status.type !== "idle") {
                  setStatus({ type: "idle", message: "" });
                }
              }}
              autoComplete="email"
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
            {status.type !== "idle" && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm text-center ${
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

            <FormFooter>
              <Link href="/login" className="text-white/60 hover:underline">
                Back to sign in
              </Link>
            </FormFooter>
          </form>
        </div>
      </div>

      <SupernovaFooter className="relative z-10 pb-10" />
    </div>
  );
}
