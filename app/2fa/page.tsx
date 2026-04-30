"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return "/dashboard";
  return rawNext;
}

function TwoFactorForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success" | null; message: string }>({
    type: null,
    message: "",
  });

  const challengeToken = useMemo(() => searchParams.get("challenge"), [searchParams]);
  const twoFactorType = useMemo(() => (searchParams.get("type") === "email" ? "email" : "totp"), [searchParams]);
  const nextPath = useMemo(() => getSafeNextPath(searchParams.get("next")), [searchParams]);

  const sendEmailCode = useCallback(async (showSuccessMessage = true) => {
    if (!challengeToken || twoFactorType !== "email") {
      return;
    }

    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/2fa/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Unable to send email code");
      }

      if (showSuccessMessage) {
        setStatus({ type: "success", message: "A sign-in code was sent to your email." });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to send email code.",
      });
    } finally {
      setSendingCode(false);
    }
  }, [challengeToken, twoFactorType]);

  useEffect(() => {
    if (twoFactorType === "email" && challengeToken) {
      void sendEmailCode(true);
    }
  }, [challengeToken, sendEmailCode, twoFactorType]);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setStatus({ type: null, message: "" });

      if (!challengeToken) {
        setStatus({ type: "error", message: "2FA session expired. Please sign in again." });
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeToken, code, type: twoFactorType }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Verification failed");
        }

        setStatus({ type: "success", message: "Verified successfully." });
        window.location.assign(nextPath);
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Invalid code.",
        });
      } finally {
        setLoading(false);
      }
    },
    [challengeToken, code, nextPath, twoFactorType]
  );

  return (
    <AuthCard
      title="Two-Factor Authentication"
      subtitle={twoFactorType === "email" ? "Enter the code sent to your email" : "Enter the code from your authenticator"}
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <Input
          id="code"
          label={twoFactorType === "email" ? "Email code" : "Authentication code"}
          name="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          required
        />

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
          {loading ? "Verifying..." : "Verify"}
        </Button>

        {twoFactorType === "email" && (
          <Button type="button" variant="ghost" disabled={sendingCode || loading || !challengeToken} onClick={() => void sendEmailCode(true)}>
            {sendingCode ? "Sending code..." : "Resend code"}
          </Button>
        )}

        <p className="text-sm text-white/60">
          Lost your code?{" "}
          <Link href="/login" className="text-[#C9EB55] hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export default function TwoFactor() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading 2FA...</div>}>
      <TwoFactorForm />
    </Suspense>
  );
}
