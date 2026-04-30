"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormFooter from "@/components/auth/FormFooter";

type Status = {
  type: "idle" | "success" | "error";
  message: string;
};

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  const tokenMissing = !token;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tokenMissing) {
      setStatus({ type: "error", message: "This reset link is missing or invalid. Request a new one." });
      return;
    }

    if (password.length < 8) {
      setStatus({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }

    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (res.ok) {
        setStatus({ type: "success", message: "Password reset successfully. You can now sign in with your new password." });
      } else {
        setStatus({
          type: "error",
          message:
            data?.error === "Invalid or expired token"
              ? "This reset link has expired or is invalid. Request a new one."
              : data?.error || "Failed to reset password. Try again.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Network error. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuthCard title="Reset password" subtitle="Choose a secure password">
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          {tokenMissing && (
            <div
              className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-center text-red-300"
              role="status"
              aria-live="polite"
            >
              This reset link is missing a token. Request a new password reset email.
            </div>
          )}

          <Input
            id="password"
            label="New password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (status.type !== "idle") {
                setStatus({ type: "idle", message: "" });
              }
            }}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <Input
            id="confirm"
            label="Confirm password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (status.type !== "idle") {
                setStatus({ type: "idle", message: "" });
              }
            }}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <p className="text-xs text-white/45 text-center">Use at least 8 characters. A long passphrase is better than a short complex password.</p>

          <Button type="submit" disabled={loading || tokenMissing || status.type === "success"}>
            {loading ? "Resetting..." : "Reset password"}
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
            {status.type === "success" ? (
              <Link href="/login" className="text-white/60 hover:underline">
                Continue to sign in
              </Link>
            ) : (
              <Link href="/forgot-password" className="text-white/60 hover:underline">
                Request a new reset link
              </Link>
            )}

            <Link href="/login" className="text-white/60 hover:underline">
              Back to sign in
            </Link>
          </FormFooter>
        </form>
      </AuthCard>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
