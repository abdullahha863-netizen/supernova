"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SecurityOverview = {
  plan: "Starter" | "Silver" | "Hash Pro" | "Titan Elite";
  security: {
    emergencyLocked: boolean;
    lockoutUntil: string | null;
    hasPinConfigured: boolean;
    pinResetLockoutUntil: string | null;
    pinResetRecoveryUntil: string | null;
  };
};

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function SecurityPanel() {
  const router = useRouter();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [pinCurrent, setPinCurrent] = useState("");
  const [pinSetup, setPinSetup] = useState("");
  const [pinLock, setPinLock] = useState("");
  const [pinUnlock, setPinUnlock] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });
  const [lockoutUntil, setLockoutUntil] = useState<string | null>(null);
  const [lockoutMs, setLockoutMs] = useState(0);
  const [pinResetLockoutUntil, setPinResetLockoutUntil] = useState<string | null>(null);
  const [pinResetLockoutMs, setPinResetLockoutMs] = useState(0);
  const [pinResetRecoveryUntil, setPinResetRecoveryUntil] = useState<string | null>(null);
  const [pinResetRecoveryMs, setPinResetRecoveryMs] = useState(0);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isRequestingRecovery, setIsRequestingRecovery] = useState(false);
  const [isVerifyingRecovery, setIsVerifyingRecovery] = useState(false);

  const canUseEmergency = useMemo(() => {
    const plan = overview?.plan;
    return plan === "Hash Pro" || plan === "Titan Elite";
  }, [overview?.plan]);
  const canActivateGuardian = useMemo(() => {
    return overview?.plan === "Silver" || overview?.plan === "Hash Pro" || overview?.plan === "Titan Elite";
  }, [overview?.plan]);
  const accountStatus = useMemo(() => {
    if (!overview) return null;
    if (!canActivateGuardian) return { label: "Emergency Lock not available for this plan", className: "border-white/15 bg-white/5 text-white/65" };
    if (lockoutMs > 0) return { label: "Locked Out", className: "border-orange-300/30 bg-orange-500/15 text-orange-100" };
    if (overview.security.emergencyLocked) return { label: "Locked", className: "border-red-300/30 bg-red-500/15 text-red-100" };
    if (!overview.security.hasPinConfigured) return { label: "PIN setup required", className: "border-yellow-300/25 bg-yellow-300/10 text-yellow-100" };
    return { label: "Active", className: "border-green-300/25 bg-green-400/10 text-green-200" };
  }, [canActivateGuardian, lockoutMs, overview]);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/dashboard/overview", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/settings/security");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load security settings.");
      }

      const nextOverview = data.overview as SecurityOverview;
      setOverview(nextOverview);
      setLockoutUntil(nextOverview.security.lockoutUntil);
      setPinResetLockoutUntil(nextOverview.security.pinResetLockoutUntil);
      setPinResetRecoveryUntil(nextOverview.security.pinResetRecoveryUntil);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load security settings.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutMs(0);
      return;
    }

    const tick = () => {
      const ms = new Date(lockoutUntil).getTime() - Date.now();
      setLockoutMs(Math.max(0, ms));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  useEffect(() => {
    if (!pinResetLockoutUntil) {
      setPinResetLockoutMs(0);
      return;
    }

    const tick = () => {
      const ms = new Date(pinResetLockoutUntil).getTime() - Date.now();
      setPinResetLockoutMs(Math.max(0, ms));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pinResetLockoutUntil]);

  useEffect(() => {
    if (!pinResetRecoveryUntil) {
      setPinResetRecoveryMs(0);
      return;
    }

    const tick = () => {
      const ms = new Date(pinResetRecoveryUntil).getTime() - Date.now();
      setPinResetRecoveryMs(Math.max(0, ms));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pinResetRecoveryUntil]);

  const requestPinRecovery = async () => {
    setSecurityMessage({ type: null, text: "" });
    setIsRequestingRecovery(true);
    try {
      const res = await fetch("/api/dashboard/security/pin/recovery/request", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to request PIN recovery.");
      }
      setSecurityMessage({ type: "success", text: "Recovery code sent. Check your account email." });
    } catch (error) {
      setSecurityMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to request PIN recovery.",
      });
    } finally {
      setIsRequestingRecovery(false);
    }
  };

  const verifyPinRecovery = async () => {
    setSecurityMessage({ type: null, text: "" });
    setIsVerifyingRecovery(true);
    try {
      const res = await fetch("/api/dashboard/security/pin/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: recoveryCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to verify recovery code.");
      }
      if (data?.recoveryUntil) setPinResetRecoveryUntil(data.recoveryUntil as string);
      setRecoveryCode("");
      setPinResetLockoutUntil(null);
      setSecurityMessage({ type: "success", text: "Recovery verified. You can reset PIN now." });
      await loadOverview();
    } catch (error) {
      setSecurityMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to verify recovery code.",
      });
    } finally {
      setIsVerifyingRecovery(false);
    }
  };

  const setupPin = async () => {
    setSecurityMessage({ type: null, text: "" });
    if (overview?.security.hasPinConfigured && pinResetRecoveryMs <= 0 && pinCurrent.length !== 6) {
      setSecurityMessage({ type: "error", text: "Enter your current 6-digit PIN first." });
      return;
    }

    setIsSettingPin(true);
    try {
      const res = await fetch("/api/dashboard/security/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: pinResetRecoveryMs > 0 ? "" : pinCurrent, newPin: pinSetup }),
      });
      if (res.status === 401) {
        router.replace("/login?next=/settings/security");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.lockoutUntil) setPinResetLockoutUntil(data.lockoutUntil as string);
        throw new Error(data?.error || "Failed to set security PIN.");
      }
      setPinResetLockoutUntil(null);
      setPinCurrent("");
      setPinSetup("");
      setSecurityMessage({ type: "success", text: "Security PIN updated successfully." });
      await loadOverview();
    } catch (error) {
      setSecurityMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to set security PIN.",
      });
    } finally {
      setIsSettingPin(false);
    }
  };

  const triggerLock = async () => {
    setSecurityMessage({ type: null, text: "" });
    setIsLocking(true);
    try {
      const res = await fetch("/api/dashboard/security/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinLock }),
      });
      if (res.status === 401) {
        router.replace("/login?next=/settings/security");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.lockoutUntil) setLockoutUntil(data.lockoutUntil as string);
        throw new Error(data?.error || "Failed to trigger emergency lock.");
      }
      setPinLock("");
      setSecurityMessage({
        type: "success",
        text: data?.alreadyLocked ? "Account is already emergency locked." : "Emergency account lock activated.",
      });
      await loadOverview();
    } catch (error) {
      setSecurityMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to trigger emergency lock.",
      });
    } finally {
      setIsLocking(false);
    }
  };

  const unlockAccount = async () => {
    setSecurityMessage({ type: null, text: "" });
    setIsUnlocking(true);
    try {
      const res = await fetch("/api/dashboard/security/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", pin: pinUnlock }),
      });
      if (res.status === 401) {
        router.replace("/login?next=/settings/security");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.lockoutUntil) setLockoutUntil(data.lockoutUntil as string);
        throw new Error(data?.error || "Failed to unlock account.");
      }
      setPinUnlock("");
      setLockoutUntil(null);
      setSecurityMessage({ type: "success", text: "Account unlocked." });
      await loadOverview();
    } catch (error) {
      setSecurityMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to unlock account.",
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return <p className="text-white/70 text-sm">Loading security settings...</p>;
  }

  if (loadError || !overview) {
    return (
      <div className="rounded-2xl border border-red-400/35 bg-red-500/10 px-6 py-5 max-w-xl w-full">
        <p className="text-red-200 text-sm">{loadError || "Security settings are unavailable."}</p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="mt-4 rounded-lg border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-sm text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#C9EB55]">Emergency Account Lock</h2>
        <p className="text-sm text-white/60">Guardian PIN is available on paid plans. Emergency Lock is available for Hash Pro and Titan Elite members.</p>
      </div>

      {accountStatus && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${accountStatus.className}`}>
          <p className="text-[11px] uppercase tracking-[0.16em] opacity-75">Account Status</p>
          <p className="mt-1 font-semibold">{accountStatus.label}</p>
        </div>
      )}

      {!canUseEmergency && (
        <p className="rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-xs text-yellow-100">
          Your current plan does not include emergency lock controls.
        </p>
      )}

      {overview.security.emergencyLocked && (
        <p className="rounded-xl border border-red-300/30 bg-red-500/15 px-3 py-2 text-xs text-red-100">
          Account is currently emergency locked.
        </p>
      )}

      {lockoutMs > 0 && (
        <p className="rounded-xl border border-orange-300/30 bg-orange-500/15 px-3 py-2 text-xs text-orange-100">
          Lock control is temporarily disabled for {formatCountdown(lockoutMs)}.
        </p>
      )}

      {overview.security.emergencyLocked && (
        <div className="space-y-2 rounded-2xl border border-[#C9EB55]/18 bg-[#C9EB55]/[0.05] p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#C9EB55]/80">Unlock Account</p>
            <p className="mt-1 text-[11px] text-white/55">Enter your Security PIN to remove the emergency lock.</p>
          </div>
          <label className="text-xs uppercase tracking-[0.15em] text-white/50">Confirm PIN and unlock</label>
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinUnlock}
              onChange={(e) => setPinUnlock(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
              placeholder="Enter PIN to unlock"
              disabled={!canUseEmergency}
            />
            <button
              type="button"
              onClick={() => void unlockAccount()}
              disabled={!canUseEmergency || isUnlocking || lockoutMs > 0 || pinUnlock.length !== 6}
              className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors disabled:opacity-60"
            >
              {isUnlocking ? "Unlocking..." : "Unlock Account"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-2xl border border-red-400/18 bg-red-500/[0.05] p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-red-200/80">Emergency Account Freeze</p>
          <p className="mt-1 text-[11px] text-white/55">Use this only when you want to lock the account immediately.</p>
        </div>
        <label className="text-xs uppercase tracking-[0.15em] text-white/50">Confirm PIN and lock now</label>
        <div className="flex gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pinLock}
            onChange={(e) => setPinLock(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
            placeholder="Enter PIN to lock"
            disabled={!canUseEmergency}
          />
          <button
            type="button"
            onClick={() => void triggerLock()}
            disabled={!canUseEmergency || isLocking || lockoutMs > 0 || pinLock.length !== 6}
            className="rounded-xl border border-red-400/45 bg-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-100 hover:bg-red-500/30 transition-colors disabled:opacity-60"
          >
            {isLocking ? "Locking..." : "Emergency Lock"}
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#C9EB55]/12 bg-black/15 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#C9EB55]/80">PIN Management</p>
          <p className="mt-1 text-[11px] text-white/55">Set, reset, or recover the PIN used for emergency protection actions.</p>
        </div>

        {pinResetLockoutMs > 0 && (
          <p className="rounded-xl border border-orange-300/30 bg-orange-500/15 px-3 py-2 text-xs text-orange-100">
            PIN reset is temporarily locked for {formatCountdown(pinResetLockoutMs)} due to repeated failed current PIN attempts.
          </p>
        )}

        {pinResetRecoveryMs > 0 && (
          <p className="rounded-xl border border-[#C9EB55]/30 bg-[#C9EB55]/10 px-3 py-2 text-xs text-[#d7f56c]">
            Recovery verified. You can reset PIN without current PIN for the next {formatCountdown(pinResetRecoveryMs)}.
          </p>
        )}

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.15em] text-white/50">
            {overview.security.hasPinConfigured ? "Reset Security PIN (6 digits)" : "Set Security PIN (6 digits)"}
          </label>
          {overview.security.hasPinConfigured && (
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinCurrent}
              onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
              placeholder="Enter current 6-digit PIN"
              disabled={!canActivateGuardian || pinResetRecoveryMs > 0}
            />
          )}
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinSetup}
              onChange={(e) => setPinSetup(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
              placeholder={overview.security.hasPinConfigured ? "Enter new 6-digit PIN" : "Enter 6-digit PIN"}
              disabled={!canActivateGuardian}
            />
            <button
              type="button"
              onClick={() => void setupPin()}
              disabled={
                !canActivateGuardian ||
                isSettingPin ||
                pinResetLockoutMs > 0 ||
                pinSetup.length !== 6 ||
                (overview.security.hasPinConfigured && pinResetRecoveryMs <= 0 && pinCurrent.length !== 6)
              }
              className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors disabled:opacity-60"
            >
              {isSettingPin ? "Saving..." : overview.security.hasPinConfigured ? "Reset PIN" : "Save PIN"}
            </button>
          </div>
          <p className="text-[11px] text-white/50">
            If locked, request a recovery code by email and verify it to unlock PIN reset securely.
          </p>
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase())}
              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
              placeholder="Enter 8-char recovery code"
              disabled={!canActivateGuardian}
            />
            <button
              type="button"
              onClick={() => void requestPinRecovery()}
              disabled={!canActivateGuardian || isRequestingRecovery}
              className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors disabled:opacity-60"
            >
              {isRequestingRecovery ? "Sending..." : "Request Code"}
            </button>
            <button
              type="button"
              onClick={() => void verifyPinRecovery()}
              disabled={!canActivateGuardian || isVerifyingRecovery || recoveryCode.length !== 8}
              className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/20 transition-colors disabled:opacity-60"
            >
              {isVerifyingRecovery ? "Verifying..." : "Verify Code"}
            </button>
          </div>
        </div>
      </div>

      {securityMessage.type && (
        <p className={`text-xs ${securityMessage.type === "success" ? "text-green-300" : "text-red-300"}`}>{securityMessage.text}</p>
      )}
    </section>
  );
}
