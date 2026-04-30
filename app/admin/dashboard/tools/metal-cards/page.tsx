"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AdminToolShell from "@/components/admin/AdminToolShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type MetalCard = {
  id: string;
  metalCardId: string;
  tier: string;
  userId: string | null;
  assignedEmail: string;
  fulfillmentId: number | null;
  status: string;
  createdAt: string;
};

type CardsResponse = {
  ok: boolean;
  cards?: MetalCard[];
  card?: MetalCard;
  error?: string;
};

const TIERS = ["Silver", "Hash Pro", "Titan Elite"] as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function badgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "issued") return "border-blue-300/30 bg-blue-500/10 text-blue-100";
  if (normalized === "shipped") return "border-violet-300/30 bg-violet-500/10 text-violet-100";
  if (normalized === "activated") return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";
  if (normalized === "revoked") return "border-red-300/30 bg-red-500/10 text-red-100";
  return "border-white/15 bg-white/[0.04] text-white/75";
}

export default function AdminMetalCardsPage() {
  const [cards, setCards] = useState<MetalCard[]>([]);
  const [search, setSearch] = useState("");
  const [metalCardId, setMetalCardId] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("Silver");
  const [assignedEmail, setAssignedEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [fulfillmentId, setFulfillmentId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [search]);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/metal-cards?${queryString}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as CardsResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to load metal cards.");
      }
      setCards(Array.isArray(payload.cards) ? payload.cards : []);
    } catch (error) {
      setCards([]);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to load metal cards." });
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  async function createCard(event: FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/metal-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metalCardId: metalCardId.trim(),
          tier,
          assignedEmail: assignedEmail.trim(),
          userId: userId.trim() || undefined,
          fulfillmentId: fulfillmentId.trim() || undefined,
          verificationCode: verificationCode.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as CardsResponse | null;

      if (!response.ok || !payload?.ok || !payload.card) {
        throw new Error(payload?.error || "Unable to register metal card.");
      }

      setCards((current) => [payload.card as MetalCard, ...current].slice(0, 50));
      setMetalCardId("");
      setAssignedEmail("");
      setUserId("");
      setFulfillmentId("");
      setVerificationCode("");
      setMessage({ type: "success", text: "Metal Card registered." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to register metal card." });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AdminToolShell
      title="Metal Cards"
      subtitle="Register physical Metal Cards, assign them to upgraded miners, and keep verification codes server-side."
    >
      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={createCard} className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">Card Registry</p>
            <h2 className="mt-2 text-xl font-black text-[#D7F27A]">Register Metal Card</h2>
          </div>

          <div className="space-y-4">
            <Input id="metalCardId" label="Metal Card ID" value={metalCardId} onChange={(event) => setMetalCardId(event.target.value)} required />

            <div className="flex flex-col gap-2">
              <label htmlFor="tier" className="text-sm text-white/70">Tier</label>
              <select
                id="tier"
                value={tier}
                onChange={(event) => setTier(event.target.value as (typeof TIERS)[number])}
                className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white focus:border-[#C9EB55] focus:outline-none focus:ring-1 focus:ring-[#C9EB55]/30"
              >
                {TIERS.map((value) => (
                  <option key={value} className="bg-black" value={value}>{value}</option>
                ))}
              </select>
            </div>

            <Input id="assignedEmail" label="Assigned Email" type="email" value={assignedEmail} onChange={(event) => setAssignedEmail(event.target.value)} required />
            <Input id="userId" label="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Optional" />
            <Input id="fulfillmentId" label="Fulfillment ID" type="number" min="1" value={fulfillmentId} onChange={(event) => setFulfillmentId(event.target.value)} placeholder="Optional" />
            <Input id="verificationCode" label="6-Digit Verification Code" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />

            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Registering..." : "Register Card"}
            </Button>
          </div>
        </form>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Latest Cards</p>
              <p className="mt-2 text-sm text-white/65">{isLoading ? "Loading cards..." : `${cards.length} card${cards.length === 1 ? "" : "s"}`}</p>
            </div>
            <div className="flex w-full gap-3 lg:w-auto">
              <Input id="metalCardSearch" aria-label="Search metal cards" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, email, user, tier..." />
              <button
                type="button"
                onClick={() => void loadCards()}
                disabled={isLoading}
                className="shrink-0 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Loading" : "Refresh"}
              </button>
            </div>
          </div>

          {message ? (
            <div className={`mb-4 rounded-2xl border p-4 text-sm ${message.type === "success" ? "border-[#C9EB55]/25 bg-[#C9EB55]/10 text-[#D7F36C]" : "border-red-500/25 bg-red-500/10 text-red-200"}`}>
              {message.text}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/60">Loading metal cards...</div>
          ) : cards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/60">No Metal Cards yet.</div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <article key={card.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">{card.metalCardId}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badgeClass(card.status)}`}>{card.status}</span>
                        <span className="rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D7F36C]">{card.tier}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/60">{card.assignedEmail}</p>
                    </div>
                    <p className="text-xs text-white/45">{formatDate(card.createdAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-white/65 md:grid-cols-2">
                    <div>User ID: {card.userId || "-"}</div>
                    <div>Fulfillment ID: {card.fulfillmentId ?? "-"}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </AdminToolShell>
  );
}
