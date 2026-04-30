"use client";

import { useCallback, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import AdminToolShell from "@/components/admin/AdminToolShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type StatusState = {
  tone: "success" | "error";
  message: string;
};

export default function Reset2FAAdminTool() {
  const [userId, setUserId] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState | null>(null);

  const trimmedUserId = userId.trim();
  const isUserIdValid = trimmedUserId.length >= 6;
  const canSubmit = isUserIdValid && confirmReset && !isSubmitting;

  const reset = useCallback(async () => {
    if (!isUserIdValid) {
      setStatus({ tone: "error", message: "Enter a valid user ID before resetting 2FA." });
      return;
    }

    if (!confirmReset) {
      setStatus({ tone: "error", message: "Confirm the reset before submitting this action." });
      return;
    }

    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/2fa/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: trimmedUserId }),
      });
      const j = await res.json();

      if (!res.ok) {
        setStatus({ tone: "error", message: j?.error || "Failed to reset 2FA for this user." });
        return;
      }

      if (j?.resetCount > 0) {
        setStatus({ tone: "success", message: `2FA reset completed for user ${trimmedUserId}. The stored TOTP secret was removed.` });
      } else {
        setStatus({ tone: "success", message: `No active 2FA record was found for user ${trimmedUserId}. Nothing needed to be removed.` });
      }
    } catch {
      setStatus({ tone: "error", message: "Request failed while trying to reset 2FA. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmReset, isUserIdValid, trimmedUserId]);

  return (
    <AdminToolShell
      title="Reset 2FA"
      subtitle="Remove TOTP access for a user from the same admin operations workspace."
    >
      <AuthCard title="Admin: Reset 2FA" subtitle="Remove TOTP for a user">
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This action disables 2FA immediately for the target user. Use it only when the user has lost access to their authenticator and cannot recover with backup codes.
        </div>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); reset(); }}>
          <Input
            id="userId"
            label="User ID"
            name="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            minLength={6}
            autoComplete="off"
            placeholder="Enter the exact user ID"
          />
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
            Use this only after confirming the user cannot sign in with their authenticator or existing backup codes.
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/85">
            <input
              type="checkbox"
              checked={confirmReset}
              onChange={(e) => setConfirmReset(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border border-white/20 bg-black/40 text-[#C9EB55]"
            />
            <span>I confirm I want to reset 2FA for this user immediately.</span>
          </label>
          {!isUserIdValid && trimmedUserId.length > 0 ? (
            <div className="text-sm text-amber-200">User ID looks too short. Enter the full identifier before submitting.</div>
          ) : null}
          <Button type="submit" disabled={!canSubmit} className={!canSubmit ? "opacity-60 cursor-not-allowed" : ""}>
            {isSubmitting ? "Resetting..." : "Reset 2FA"}
          </Button>
          {status ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${status.tone === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-red-500/30 bg-red-500/10 text-red-100"}`}>
              {status.message}
            </div>
          ) : null}
        </form>
      </AuthCard>
    </AdminToolShell>
  );
}
