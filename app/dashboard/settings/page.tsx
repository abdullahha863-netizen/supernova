"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SecurityPanel from "@/components/security/SecurityPanel";

type DashboardOverview = {
  plan: "Starter" | "Silver" | "Hash Pro" | "Titan Elite";
  payoutSettings: {
    payoutAddress: string;
    minPayout: number;
  };
  summary: {
    totalHashrate: string;
    pendingBalance: string;
    rewardFlow: string;
    onlineWorkers: number;
    totalWorkers: number;
  };
  workers: Array<{
    id: string;
    name: string;
    hashrate: string;
    status: "online" | "offline" | "warning";
    lastShare: string;
    rejectRate: string;
  }>;
  payouts: Array<{
    id: string;
    date: string;
    amount: string;
    status: "paid" | "pending";
    tx: string;
  }>;
  memberCard?: {
    trackingNumber: string;
    carrier: string;
  } | null;
};

type ShippingProfile = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type SectionKey = "security" | "payout" | "miner" | "referral";
type PlanTier = DashboardOverview["plan"];

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "security", label: "Security" },
  { key: "payout", label: "Payout Settings" },
  { key: "miner", label: "Profile Settings" },
  { key: "referral", label: "Referral" },
];

const referralOffersByPlan: Record<PlanTier, Array<{ miners: string; reward: string }>> = {
  Starter: [
    { miners: "5 miners", reward: "Silver plan free for 1 month" },
    { miners: "7 miners", reward: "Silver plan free for 3 months" },
  ],
  Silver: [{ miners: "3 miners", reward: "3% discount on subscription renewal" }],
  "Hash Pro": [{ miners: "3 miners", reward: "3% discount on subscription renewal" }],
  "Titan Elite": [{ miners: "3 miners", reward: "3% discount on subscription renewal" }],
};

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-[#C9EB55]">{title}</h2>
        {description ? <p className="text-sm text-white/60">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey>("security");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [payoutAddress, setPayoutAddress] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [minPayout, setMinPayout] = useState("30");
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileTwoFactorCode, setProfileTwoFactorCode] = useState("");
  const [profileHasTwoFactor, setProfileHasTwoFactor] = useState(false);
  const [shippingFullName, setShippingFullName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Array<{
    id: string;
    referred: { id: string; name: string; email: string };
    status: string;
    rewardStatus: string;
    rewardType: string | null;
    rewardAmount: number | null;
    createdAt: string;
  }>>([]);
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    pending: number;
    qualified: number;
    approved: number;
    rejected: number;
    pendingRewards: number;
    approvedRewards: number;
    paidRewards: number;
    totalRewardAmount: number;
  } | null>(null);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);
  const [referralStatusFilter, setReferralStatusFilter] = useState<"all" | "pending" | "qualified" | "approved" | "rejected">("all");
  const [referralSearch, setReferralSearch] = useState("");
  const [renewalQuote, setRenewalQuote] = useState<{
    plan: PlanTier;
    basePrice: number;
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
    approvedRenewalDiscounts: number;
  } | null>(null);
  const [isApplyingRenewal, setIsApplyingRenewal] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [referralPreviewPlan, setReferralPreviewPlan] = useState<"auto" | PlanTier>("auto");
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });

  const isValidKaspaAddress = (value: string) => /^kaspa:[a-z0-9]{20,}$/i.test(value.trim());

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/dashboard/overview", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/settings");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load settings.");
      }
      const nextOverview = data.overview as DashboardOverview;
      setOverview(nextOverview);
      setPayoutAddress(nextOverview.payoutSettings.payoutAddress);
      setMinPayout(String(nextOverview.payoutSettings.minPayout));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load settings.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load profile.");
      }

      setProfileName(String(data.profile?.name || ""));
      setProfileEmail(String(data.profile?.email || ""));
      setProfileHasTwoFactor(Boolean(data.profile?.twoFactorEnabled));
      setReferralCode(String(data.profile?.referralCode || ""));
      setShippingFullName(String(data.profile?.shipping?.fullName || ""));
      setShippingPhone(String(data.profile?.shipping?.phone || ""));
      setShippingLine1(String(data.profile?.shipping?.line1 || ""));
      setShippingLine2(String(data.profile?.shipping?.line2 || ""));
      setShippingCity(String(data.profile?.shipping?.city || ""));
      setShippingState(String(data.profile?.shipping?.state || ""));
      setShippingPostalCode(String(data.profile?.shipping?.postalCode || ""));
      setShippingCountry(String(data.profile?.shipping?.country || ""));
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load profile.",
      });
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const loadReferrals = useCallback(async () => {
    setIsLoadingReferrals(true);
    try {
      const params = new URLSearchParams();
      params.set("status", referralStatusFilter);
      if (referralSearch.trim()) {
        params.set("search", referralSearch.trim());
      }

      const res = await fetch(`/api/dashboard/referrals?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/settings");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load referrals.");
      }

      setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
      setReferralStats(data.stats || null);
    } catch (error) {
      console.error("[settings/referrals]", error);
    } finally {
      setIsLoadingReferrals(false);
    }
  }, [router, referralSearch, referralStatusFilter]);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  const loadRenewalQuote = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/subscription/renew", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/settings");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load renewal quote.");
      }
      setRenewalQuote(data.quote || null);
    } catch (error) {
      console.error("[settings/renewal-quote]", error);
    }
  }, [router]);

  useEffect(() => {
    void loadRenewalQuote();
  }, [loadRenewalQuote]);

  const applyRenewalNow = useCallback(async () => {
    setRenewalMessage("");
    setIsApplyingRenewal(true);
    try {
      const res = await fetch("/api/dashboard/subscription/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/settings");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to apply renewal.");
      }

      const applied = Boolean(data?.renewal?.discountApplied);
      setRenewalMessage(applied ? "Renewal discount applied successfully." : "Renewal processed with no available discount.");

      await Promise.all([loadRenewalQuote(), loadReferrals()]);
    } catch (error) {
      setRenewalMessage(error instanceof Error ? error.message : "Failed to apply renewal.");
    } finally {
      setIsApplyingRenewal(false);
    }
  }, [loadReferrals, loadRenewalQuote, router]);

  const payoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPayoutMessage({ type: null, text: "" });
    if (!isValidKaspaAddress(payoutAddress)) {
      setPayoutMessage({ type: "error", text: "Enter a valid Kaspa address in format kaspa:..." });
      return;
    }
    if (!currentPassword.trim()) {
      setPayoutMessage({ type: "error", text: "Enter your current password to confirm this change." });
      return;
    }
    setIsSavingPayout(true);
    try {
      const res = await fetch("/api/dashboard/payout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutAddress,
          minPayout: Number(minPayout),
          currentPassword,
          twoFactorCode,
        }),
      });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/settings");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save payout settings.");
      }
      setPayoutMessage({ type: "success", text: "Payout settings updated." });
      setCurrentPassword("");
      setTwoFactorCode("");
      await loadOverview();
    } catch (error) {
      setPayoutMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save payout settings.",
      });
    } finally {
      setIsSavingPayout(false);
    }
  };

  const profileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: null, text: "" });

    if (!profileName.trim()) {
      setProfileMessage({ type: "error", text: "Display name is required." });
      return;
    }
    if (!profileEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail.trim())) {
      setProfileMessage({ type: "error", text: "Enter a valid email address." });
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          currentPassword: profileCurrentPassword,
          twoFactorCode: profileTwoFactorCode,
          shipping: {
            fullName: shippingFullName,
            phone: shippingPhone,
            line1: shippingLine1,
            line2: shippingLine2,
            city: shippingCity,
            state: shippingState,
            postalCode: shippingPostalCode,
            country: shippingCountry,
          } satisfies ShippingProfile,
        }),
      });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/settings");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save profile settings.");
      }
      setProfileMessage({ type: "success", text: String(data?.message || "Profile settings saved.") });
      setProfileCurrentPassword("");
      setProfileTwoFactorCode("");
      await loadProfile();
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save profile settings.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const referralCsvRows = useMemo(() => {
    return referrals.map((item) => [
      item.referred?.name || "Unnamed",
      item.referred?.email || "-",
      item.status,
      item.rewardStatus,
      item.rewardType || "",
      item.rewardAmount != null ? String(item.rewardAmount) : "",
      new Date(item.createdAt).toISOString(),
    ]);
  }, [referrals]);

  const exportReferralsCsv = useCallback(() => {
    const header = ["name", "email", "status", "rewardStatus", "rewardType", "rewardAmount", "createdAt"];
    const rows = [header, ...referralCsvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [referralCsvRows]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/70">Loading settings...</p>
      </div>
    );
  }

  if (loadError || !overview) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="rounded-2xl border border-red-400/35 bg-red-500/10 px-6 py-5 max-w-xl w-full">
          <p className="text-red-200 text-sm">{loadError || "Settings are unavailable."}</p>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="mt-4 rounded-lg border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-sm text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const effectiveReferralPlan: PlanTier = referralPreviewPlan === "auto" ? overview.plan : referralPreviewPlan;
  const effectiveReferralOffers = referralOffersByPlan[effectiveReferralPlan];
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-10 space-y-7">
        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 md:p-8">
          <div className="space-y-2">
            <Link href="/dashboard" className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white">
              Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-black">Settings</h1>
            <p className="text-white/70 text-sm md:text-base">Manage account controls and miner preferences from one place.</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-4 h-fit lg:sticky lg:top-24">
            <nav className="space-y-2">
              {sections.map((section) => {
                const isActive = section.key === activeSection;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-[#C9EB55]/35 bg-[#C9EB55]/12 text-[#C9EB55]"
                        : "border-white/10 bg-black/25 text-white/75 hover:bg-black/40"
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6">
            {activeSection === "security" ? <SecurityPanel /> : null}

            {activeSection === "payout" ? (
              <Panel title="Payout Settings" description="Update your payout address, threshold, and schedule.">
                <form onSubmit={payoutSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.15em] text-white/50">Payout Address</label>
                    <input
                      type="text"
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                      placeholder="kaspa:..."
                    />
                    <p className="text-xs text-orange-300/90">
                      Warning: Enter a valid Kaspa address only and verify it before saving. Any mistake may result in permanent loss of funds.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.15em] text-white/50">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                    />
                    <p className="text-xs text-white/55">Required to confirm payout address changes.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.15em] text-white/50">2FA Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                      placeholder="Enter 6-digit code (if 2FA enabled)"
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-white/55">Required when your account has 2FA enabled.</p>
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.15em] text-white/50">Min Payout (KAS)</label>
                      <input
                        type="number"
                        min="30"
                        value={minPayout}
                        onChange={(e) => setMinPayout(e.target.value)}
                        className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                      />
                      <p className="text-xs text-white/55">Payouts are processed automatically every 24 hours once your balance reaches the minimum threshold.</p>
                    </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="submit"
                      disabled={isSavingPayout}
                      className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-5 py-2.5 text-sm font-semibold text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors disabled:opacity-60"
                    >
                      {isSavingPayout ? "Saving..." : "Save Settings"}
                    </button>
                    {payoutMessage.type ? (
                      <p className={`text-xs ${payoutMessage.type === "success" ? "text-green-300" : "text-red-300"}`}>{payoutMessage.text}</p>
                    ) : null}
                  </div>
                </form>
              </Panel>
            ) : null}

            {activeSection === "miner" ? (
              <Panel title="Profile Settings" description="Manage your profile identity and contact details.">
                <form onSubmit={profileSubmit} className="space-y-4">
                  <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.15em] text-white/50">Display Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                          placeholder="Enter your display name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.15em] text-white/50">Email</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                          placeholder="name@example.com"
                        />
                        <p className="text-[11px] text-white/50">Changing email requires your current password and 2FA.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.15em] text-white/50">Current Password</label>
                        <input
                          type="password"
                          value={profileCurrentPassword}
                          onChange={(e) => setProfileCurrentPassword(e.target.value)}
                          className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                          placeholder="Required if email changes"
                          autoComplete="current-password"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.15em] text-white/50">2FA Code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={profileTwoFactorCode}
                          onChange={(e) => setProfileTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                          placeholder={profileHasTwoFactor ? "Required if email changes" : "Not required unless 2FA is enabled"}
                          autoComplete="one-time-code"
                        />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#C9EB55]/80">Shipping Details</p>
                          <p className="mt-1 text-[11px] text-white/55">Used as the default delivery snapshot when a metal card fulfillment record is created.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.15em] text-white/50">Recipient Full Name</label>
                            <input
                              type="text"
                              value={shippingFullName}
                              onChange={(e) => setShippingFullName(e.target.value)}
                              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                              placeholder="Full legal recipient name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.15em] text-white/50">Phone</label>
                            <input
                              type="text"
                              value={shippingPhone}
                              onChange={(e) => setShippingPhone(e.target.value)}
                              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                              placeholder="Optional contact number"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-[0.15em] text-white/50">Address Line 1</label>
                          <input
                            type="text"
                            value={shippingLine1}
                            onChange={(e) => setShippingLine1(e.target.value)}
                            className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                            placeholder="Street address, building, suite"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-[0.15em] text-white/50">Address Line 2</label>
                          <input
                            type="text"
                            value={shippingLine2}
                            onChange={(e) => setShippingLine2(e.target.value)}
                            className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                            placeholder="Apartment, floor, landmark"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.15em] text-white/50">City</label>
                            <input
                              type="text"
                              value={shippingCity}
                              onChange={(e) => setShippingCity(e.target.value)}
                              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                              placeholder="City"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.15em] text-white/50">State / Region</label>
                            <input
                              type="text"
                              value={shippingState}
                              onChange={(e) => setShippingState(e.target.value)}
                              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                              placeholder="State or region"
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.15em] text-white/50">Postal Code</label>
                            <input
                              type="text"
                              value={shippingPostalCode}
                              onChange={(e) => setShippingPostalCode(e.target.value)}
                              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                              placeholder="Postal or ZIP code"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.15em] text-white/50">Country</label>
                            <input
                              type="text"
                              value={shippingCountry}
                              onChange={(e) => setShippingCountry(e.target.value)}
                              className="w-full rounded-xl border border-[#C9EB55]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                              placeholder="Country"
                            />
                          </div>
                        </div>
                      </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-5 py-2.5 text-sm font-semibold text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors disabled:opacity-60"
                    >
                      {isSavingProfile ? "Saving..." : "Save Profile"}
                    </button>
                    {profileMessage.type ? (
                      <p className={`text-xs ${profileMessage.type === "success" ? "text-green-300" : "text-red-300"}`}>{profileMessage.text}</p>
                    ) : null}
                  </div>
                </form>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/65">
                  Account Plan: <span className="text-[#C9EB55] font-semibold">{overview.plan}</span>
                  {overview.memberCard?.trackingNumber ? (
                    <span className="block mt-2 text-white/55">
                      Latest Tracking: <span className="text-[#C9EB55]">{overview.memberCard.carrier || "Carrier"} {overview.memberCard.trackingNumber}</span>
                    </span>
                  ) : null}
                </div>
              </Panel>
            ) : null}

            {activeSection === "referral" ? (
              <Panel title="Referral Program" description="Program tiers, anti-fraud eligibility rules, and legal terms.">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    `Referral Link: https://snovapool.io/r/${referralCode || "loading..."}`,
                    "Qualified Referrals: New users who register through your referral link",
                    "Reward Status: Pending until anti-fraud checks are completed",
                    `Current Plan: ${effectiveReferralPlan}`,
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/75">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_auto]">
                  <select
                    value={referralStatusFilter}
                    onChange={(e) => setReferralStatusFilter(e.target.value as "all" | "pending" | "qualified" | "approved" | "rejected")}
                    className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/75 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                  >
                    <option className="bg-black" value="all">All Statuses</option>
                    <option className="bg-black" value="pending">Pending</option>
                    <option className="bg-black" value="qualified">Qualified</option>
                    <option className="bg-black" value="approved">Approved</option>
                    <option className="bg-black" value="rejected">Rejected</option>
                  </select>
                  <input
                    type="text"
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    placeholder="Search by miner name or email"
                    className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                  />
                  <button
                    type="button"
                    onClick={exportReferralsCsv}
                    className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-4 py-2 text-sm font-semibold text-[#C9EB55] hover:bg-[#C9EB55]/20"
                  >
                    Export CSV
                  </button>
                </div>


                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/70">
                    Total Referrals: <span className="text-[#C9EB55] font-semibold">{referralStats?.totalReferrals ?? 0}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/70">
                    Qualified: <span className="text-[#C9EB55] font-semibold">{referralStats?.qualified ?? 0}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/70">
                    Pending: <span className="text-[#C9EB55] font-semibold">{referralStats?.pending ?? 0}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/70">
                    Rejected: <span className="text-[#C9EB55] font-semibold">{referralStats?.rejected ?? 0}</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
                  <table className="min-w-full text-left text-sm text-white/80">
                    <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-[0.12em] text-white/55">
                      <tr>
                        <th className="px-4 py-3">Referred Miner</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Reward</th>
                        <th className="px-4 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingReferrals ? (
                        <tr>
                          <td className="px-4 py-4 text-white/60" colSpan={5}>Loading referral miners...</td>
                        </tr>
                      ) : referrals.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-white/60" colSpan={5}>No miners have registered through your referral link yet.</td>
                        </tr>
                      ) : (
                        referrals.map((item, index) => (
                          <tr key={item.id} className={index < referrals.length - 1 ? "border-b border-white/10" : ""}>
                            <td className="px-4 py-3 font-medium text-white">{item.referred?.name || "Unnamed"}</td>
                            <td className="px-4 py-3 text-white/75">{item.referred?.email || "-"}</td>
                            <td className="px-4 py-3 capitalize text-white/75">{item.status}</td>
                            <td className="px-4 py-3 capitalize text-white/75">{item.rewardStatus}</td>
                            <td className="px-4 py-3 text-white/75">{new Date(item.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Renewal Billing Preview</h3>
                  <div className="grid gap-3 md:grid-cols-5 text-xs text-white/75">
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      Plan: <span className="text-[#C9EB55]">{renewalQuote?.plan || "-"}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      Base: <span className="text-[#C9EB55]">${renewalQuote?.basePrice?.toFixed(2) ?? "0.00"}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      Discount: <span className="text-[#C9EB55]">{renewalQuote?.discountPercent ?? 0}%</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      Save: <span className="text-[#C9EB55]">${renewalQuote?.discountAmount?.toFixed(2) ?? "0.00"}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      Final: <span className="text-[#C9EB55]">${renewalQuote?.finalPrice?.toFixed(2) ?? "0.00"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={applyRenewalNow}
                      disabled={isApplyingRenewal}
                      className="rounded-xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-4 py-2 text-sm font-semibold text-[#C9EB55] hover:bg-[#C9EB55]/20 disabled:opacity-60"
                    >
                      {isApplyingRenewal ? "Processing Renewal..." : "Simulate Renewal Charge"}
                    </button>
                    {renewalMessage ? <p className="text-xs text-white/65">{renewalMessage}</p> : null}
                  </div>
                </div>
                {isDev ? (
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-white/65">
                        During development, you can preview each plan without changing your real subscription.
                      </p>
                      <div className="flex items-center gap-2">
                        <label htmlFor="referral-plan-preview" className="text-xs uppercase tracking-[0.12em] text-white/55">
                          Plan Preview
                        </label>
                        <select
                          id="referral-plan-preview"
                          value={referralPreviewPlan}
                          onChange={(e) => setReferralPreviewPlan(e.target.value as "auto" | PlanTier)}
                          className="rounded-lg border border-[#C9EB55]/20 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/50"
                        >
                          <option className="bg-black" value="auto">Auto (my real plan)</option>
                          <option className="bg-black" value="Starter">Starter</option>
                          <option className="bg-black" value="Silver">Silver</option>
                          <option className="bg-black" value="Hash Pro">Hash Pro</option>
                          <option className="bg-black" value="Titan Elite">Titan Elite</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-[#C9EB55]">Visible Offer Set: {effectiveReferralPlan}</p>
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
                  <table className="min-w-full text-left text-sm text-white/80">
                    <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-[0.12em] text-white/55">
                      <tr>
                        <th className="px-4 py-3">Subscription Plan</th>
                        <th className="px-4 py-3">Qualified Miners</th>
                        <th className="px-4 py-3">Reward</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveReferralOffers.map((offer, index) => (
                        <tr key={`${effectiveReferralPlan}-${offer.miners}`} className={index < effectiveReferralOffers.length - 1 ? "border-b border-white/10" : ""}>
                          <td className="px-4 py-3 font-semibold text-white">{effectiveReferralPlan === "Starter" ? "Starter (Free)" : effectiveReferralPlan}</td>
                          <td className="px-4 py-3">{offer.miners}</td>
                          <td className="px-4 py-3">{offer.reward}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/8 p-4 text-xs text-[#E9FFB0]">
                  Important: The 3% discount for paid plans is applied on renewal billing only. Free Starter upgrades are temporary promotional plan boosts and do not change pool ownership or internal pool rights.
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <h3 className="text-sm font-semibold text-white">Anti-Fraud Eligibility Rules</h3>
                    <ul className="mt-3 space-y-2 text-xs text-white/70">
                      <li>1. Referred users must be new accounts created through your referral link.</li>
                      <li>2. Referred users must verify email and keep accounts active for at least 14 days.</li>
                      <li>3. A referral becomes qualified only after meaningful activity or a valid plan activation.</li>
                      <li>4. Self-referrals and related-account abuse are prohibited and may be rejected.</li>
                      <li>5. Suspicious registrations, disposable emails, bots, or repeated device fingerprints may be disqualified.</li>
                      <li>6. Rewards can remain pending until compliance and risk checks are complete.</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <h3 className="text-sm font-semibold text-white">Legal Terms and Protection</h3>
                    <ul className="mt-3 space-y-2 text-xs text-white/70">
                      <li>1. Supernov1 may approve, deny, reverse, or suspend rewards in cases of abuse, refunds, chargebacks, or policy violations.</li>
                      <li>2. Reward decisions are final after internal risk review and audit verification.</li>
                      <li>3. Program terms, reward thresholds, and eligibility criteria may be updated at any time.</li>
                      <li>4. Attempting to manipulate the program can result in reward cancellation and account action.</li>
                      <li>5. Participation in the referral program confirms acceptance of platform Terms of Service and applicable laws.</li>
                    </ul>
                  </div>
                </div>

                <p className="text-xs text-white/50">
                  Legal notice: this section is a platform policy summary. For full legal enforceability in your jurisdiction, obtain review from a licensed attorney.
                </p>
              </Panel>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}


