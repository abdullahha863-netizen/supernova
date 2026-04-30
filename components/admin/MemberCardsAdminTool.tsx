"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminToolShell from "@/components/admin/AdminToolShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type FulfillmentItem = {
  checkout_intent_id: string;
  user_id: string;
  tier: "Silver" | "Hash Pro" | "Titan Elite";
  card_label: string;
  fulfillment_status: "queued" | "in_production" | "shipped" | "delivered";
  payment_status: string | null;
  payment_provider: string | null;
  amount_usd: number | null;
  currency: string | null;
  purchase_date: string | null;
  shipping_full_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  notes: string;
  estimated_delivery: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

type FulfillmentUpdateDraft = Partial<Pick<
  FulfillmentItem,
  | "fulfillment_status"
  | "carrier"
  | "tracking_number"
  | "tracking_url"
  | "notes"
  | "estimated_delivery"
  | "shipping_full_name"
  | "shipping_phone"
  | "shipping_line1"
  | "shipping_line2"
  | "shipping_city"
  | "shipping_state"
  | "shipping_postal_code"
  | "shipping_country"
>>;

const STATUSES: FulfillmentItem["fulfillment_status"][] = ["queued", "in_production", "shipped", "delivered"];

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null || Number.isNaN(amount)) return "-";
  return `${amount.toFixed(2)} ${currency || "USD"}`;
}

function isSameUtcDay(value: string | null, reference: Date) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCFullYear() === reference.getUTCFullYear()
    && date.getUTCMonth() === reference.getUTCMonth()
    && date.getUTCDate() === reference.getUTCDate();
}

function csvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

function formatShippingAddress(item: FulfillmentItem) {
  return [
    item.shipping_full_name,
    item.shipping_phone,
    item.shipping_line1,
    item.shipping_line2,
    [item.shipping_city, item.shipping_state, item.shipping_postal_code].filter(Boolean).join(", "),
    item.shipping_country,
  ].filter(Boolean).join("\n");
}

function ageInDays(value: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, (Date.now() - date.getTime()) / 86400000);
}

function getPriorityMeta(item: FulfillmentItem) {
  const purchaseAgeDays = ageInDays(item.purchase_date || item.created_at);

  if (item.fulfillment_status === "queued" && purchaseAgeDays >= 3) {
    return { label: "Overdue Queue", tone: "border-red-300/30 bg-red-500/10 text-red-100", score: 0 };
  }
  if (item.fulfillment_status === "in_production" && purchaseAgeDays >= 5) {
    return { label: "Production Delay", tone: "border-amber-300/30 bg-amber-500/10 text-amber-100", score: 1 };
  }
  if (item.fulfillment_status === "queued") {
    return { label: "Needs Processing", tone: "border-orange-300/30 bg-orange-500/10 text-orange-100", score: 2 };
  }
  if (item.fulfillment_status === "in_production") {
    return { label: "In Progress", tone: "border-blue-300/30 bg-blue-500/10 text-blue-100", score: 3 };
  }
  if (item.fulfillment_status === "shipped") {
    return { label: "Shipped", tone: "border-violet-300/30 bg-violet-500/10 text-violet-100", score: 4 };
  }
  return { label: "Completed", tone: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100", score: 5 };
}

function getShippingReadiness(item: FulfillmentItem) {
  const missingAddressFields: string[] = [];

  if (!item.shipping_full_name.trim()) missingAddressFields.push("name");
  if (!item.shipping_line1.trim()) missingAddressFields.push("address");
  if (!item.shipping_city.trim()) missingAddressFields.push("city");
  if (!item.shipping_country.trim()) missingAddressFields.push("country");

  const missingTrackingNumber = !item.tracking_number.trim();
  const missingCarrier = !item.carrier.trim();

  return {
    missingAddressFields,
    missingTrackingNumber,
    missingCarrier,
    canShip: missingAddressFields.length === 0 && !missingTrackingNumber,
  };
}

function getDraftShippingReadiness(params: {
  shippingFullName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingCountry: string;
  carrier: string;
  trackingNumber: string;
}) {
  const missingAddressFields: string[] = [];

  if (!params.shippingFullName.trim()) missingAddressFields.push("name");
  if (!params.shippingLine1.trim()) missingAddressFields.push("address");
  if (!params.shippingCity.trim()) missingAddressFields.push("city");
  if (!params.shippingCountry.trim()) missingAddressFields.push("country");

  const missingTrackingNumber = !params.trackingNumber.trim();
  const missingCarrier = !params.carrier.trim();

  return {
    missingAddressFields,
    missingTrackingNumber,
    missingCarrier,
    canShip: missingAddressFields.length === 0 && !missingTrackingNumber,
  };
}

function badgeClass(kind: "tier" | "fulfillment" | "payment", value: string | null | undefined) {
  const normalized = String(value || "").toLowerCase();

  if (kind === "tier") {
    if (normalized === "silver") return "border-slate-300/30 bg-slate-200/10 text-slate-100";
    if (normalized === "hash pro") return "border-sky-300/30 bg-sky-400/10 text-sky-100";
    if (normalized === "titan elite") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  if (kind === "fulfillment") {
    if (normalized === "queued") return "border-white/20 bg-white/10 text-white/80";
    if (normalized === "in_production") return "border-blue-300/30 bg-blue-400/10 text-blue-100";
    if (normalized === "shipped") return "border-violet-300/30 bg-violet-400/10 text-violet-100";
    if (normalized === "delivered") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }

  if (kind === "payment") {
    if (normalized === "succeeded") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
    if (normalized === "processing") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
    if (normalized === "pending" || normalized === "requires_action" || normalized === "requires_payment_method") {
      return "border-orange-300/30 bg-orange-400/10 text-orange-100";
    }
    if (normalized === "payment_failed" || normalized === "canceled") return "border-red-300/30 bg-red-400/10 text-red-100";
  }

  return "border-white/15 bg-white/[0.04] text-white/75";
}

function Badge({ label, kind }: { label: string; kind: "tier" | "fulfillment" | "payment" }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badgeClass(kind, label)}`}>{label}</span>;
}

function PriorityBadge({ item }: { item: FulfillmentItem }) {
  const priority = getPriorityMeta(item);
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${priority.tone}`}>{priority.label}</span>;
}

function WarningBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-red-300/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-100">{label}</span>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-white/70">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white"
      >
        {options.map((option) => (
          <option key={option} className="bg-black" value={option}>
            {option === "all" ? "All" : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryCard({ label, value, tone = "text-[#D7F27A]" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/55">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default function MemberCardsAdminTool() {
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentItem["fulfillment_status"]>("queued");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [shippingFullName, setShippingFullName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (tierFilter !== "all" && item.tier !== tierFilter) return false;
      if (statusFilter !== "all" && item.fulfillment_status !== statusFilter) return false;
      if (countryFilter !== "all" && item.shipping_country !== countryFilter) return false;
      if (paymentFilter !== "all" && (item.payment_status || "unknown") !== paymentFilter) return false;
      if (!query) return true;

      const haystack = [
        item.user_id,
        item.shipping_email,
        item.shipping_full_name,
        item.checkout_intent_id,
        item.card_label,
        item.tier,
        item.tracking_number,
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [countryFilter, items, paymentFilter, searchQuery, statusFilter, tierFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => {
      const leftPriority = getPriorityMeta(left).score;
      const rightPriority = getPriorityMeta(right).score;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      const leftTime = new Date(left.purchase_date || left.created_at).getTime() || 0;
      const rightTime = new Date(right.purchase_date || right.created_at).getTime() || 0;
      return rightTime - leftTime;
    });
  }, [filteredItems]);

  const selectedItem = useMemo(
    () => sortedItems.find((item) => item.checkout_intent_id === selectedId) || null,
    [sortedItems, selectedId]
  );

  const countryOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.shipping_country).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const paymentStatusOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.payment_status || "unknown"))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const summary = useMemo(() => {
    const now = new Date();
    const queued = items.filter((item) => item.fulfillment_status === "queued").length;
    const delayed = items.filter((item) => {
      const priority = getPriorityMeta(item);
      return priority.label === "Overdue Queue" || priority.label === "Production Delay";
    }).length;
    const shippedToday = items.filter((item) => isSameUtcDay(item.shipped_at, now)).length;
    const delivered = items.filter((item) => item.fulfillment_status === "delivered").length;

    return { queued, delayed, shippedToday, delivered };
  }, [items]);

  const hydrateForm = useCallback((item: FulfillmentItem | null) => {
    setFulfillmentStatus(item?.fulfillment_status || "queued");
    setCarrier(item?.carrier || "");
    setTrackingNumber(item?.tracking_number || "");
    setTrackingUrl(item?.tracking_url || "");
    setNotes(item?.notes || "");
    setEstimatedDelivery(item?.estimated_delivery ? item.estimated_delivery.slice(0, 16) : "");
    setShippingFullName(item?.shipping_full_name || "");
    setShippingPhone(item?.shipping_phone || "");
    setShippingLine1(item?.shipping_line1 || "");
    setShippingLine2(item?.shipping_line2 || "");
    setShippingCity(item?.shipping_city || "");
    setShippingState(item?.shipping_state || "");
    setShippingPostalCode(item?.shipping_postal_code || "");
    setShippingCountry(item?.shipping_country || "");
  }, []);

  useEffect(() => {
    hydrateForm(selectedItem);
  }, [hydrateForm, selectedItem]);

  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedId("");
      return;
    }

    if (!sortedItems.some((item) => item.checkout_intent_id === selectedId)) {
      setSelectedId(sortedItems[0].checkout_intent_id);
    }
  }, [sortedItems, selectedId]);

  const copyValue = useCallback(async (label: string, value: string) => {
    if (!value) {
      setStatusMessage(`No ${label.toLowerCase()} to copy.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setStatusMessage(`${label} copied.`);
    } catch {
      setStatusMessage(`Failed to copy ${label.toLowerCase()}.`);
    }
  }, []);

  const applyItemUpdate = useCallback(async (item: FulfillmentItem, overrides?: FulfillmentUpdateDraft) => {
    const res = await fetch("/api/admin/member-cards", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkoutIntentId: item.checkout_intent_id,
        fulfillmentStatus: overrides?.fulfillment_status || item.fulfillment_status,
        carrier: overrides?.carrier ?? item.carrier,
        trackingNumber: overrides?.tracking_number ?? item.tracking_number,
        trackingUrl: overrides?.tracking_url ?? item.tracking_url,
        notes: overrides?.notes ?? item.notes,
        estimatedDelivery: overrides?.estimated_delivery ? new Date(overrides.estimated_delivery).toISOString() : item.estimated_delivery || "",
        shippingFullName: overrides?.shipping_full_name ?? item.shipping_full_name,
        shippingPhone: overrides?.shipping_phone ?? item.shipping_phone,
        shippingLine1: overrides?.shipping_line1 ?? item.shipping_line1,
        shippingLine2: overrides?.shipping_line2 ?? item.shipping_line2,
        shippingCity: overrides?.shipping_city ?? item.shipping_city,
        shippingState: overrides?.shipping_state ?? item.shipping_state,
        shippingPostalCode: overrides?.shipping_postal_code ?? item.shipping_postal_code,
        shippingCountry: overrides?.shipping_country ?? item.shipping_country,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Failed to update fulfillment.");
    }

    return data.item as FulfillmentItem;
  }, []);

  const runQuickAction = useCallback(async (item: FulfillmentItem, nextStatus: FulfillmentItem["fulfillment_status"]) => {
    const readiness = getShippingReadiness(item);

    if (nextStatus === "shipped") {
      if (!readiness.canShip) {
        const reasons = [
          readiness.missingTrackingNumber ? "tracking number" : null,
          readiness.missingAddressFields.length > 0 ? `address fields: ${readiness.missingAddressFields.join(", ")}` : null,
        ].filter(Boolean).join(" and ");
        setStatusMessage(`Cannot mark as shipped. Missing ${reasons}.`);
        return;
      }

      const confirmed = window.confirm(`Mark ${item.card_label} as shipped?`);
      if (!confirmed) {
        return;
      }
    }

    setStatusMessage(null);
    try {
      const updated = await applyItemUpdate(item, { fulfillment_status: nextStatus });
      setItems((current) => current.map((entry) => entry.checkout_intent_id === item.checkout_intent_id ? updated : entry));
      if (selectedId === item.checkout_intent_id) {
        hydrateForm(updated);
      }
      setStatusMessage(`Fulfillment moved to ${nextStatus}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update fulfillment.");
    }
  }, [applyItemUpdate, hydrateForm, selectedId]);

  const exportCsv = useCallback(() => {
    if (sortedItems.length === 0) {
      setStatusMessage("No records to export.");
      return;
    }

    const header = [
      "checkout_intent_id",
      "user_id",
      "tier",
      "card_label",
      "fulfillment_status",
      "payment_status",
      "payment_provider",
      "amount_usd",
      "currency",
      "purchase_date",
      "shipping_full_name",
      "shipping_email",
      "shipping_phone",
      "shipping_country",
      "carrier",
      "tracking_number",
      "tracking_url",
    ];

    const rows = sortedItems.map((item) => [
      item.checkout_intent_id,
      item.user_id,
      item.tier,
      item.card_label,
      item.fulfillment_status,
      item.payment_status,
      item.payment_provider,
      item.amount_usd,
      item.currency,
      item.purchase_date,
      item.shipping_full_name,
      item.shipping_email,
      item.shipping_phone,
      item.shipping_country,
      item.carrier,
      item.tracking_number,
      item.tracking_url,
    ]);

    const csv = [header, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `member-cards-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${sortedItems.length} record(s) to CSV.`);
  }, [sortedItems]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/member-cards");
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load fulfillments.");
      }

      const nextItems = Array.isArray(data.items) ? (data.items as FulfillmentItem[]) : [];
      setItems(nextItems);
      if (nextItems.length > 0) {
        const nextSelected = nextItems.find((item) => item.checkout_intent_id === selectedId) || nextItems[0];
        setSelectedId(nextSelected.checkout_intent_id);
      } else {
        setSelectedId("");
      }
      setStatusMessage(`Loaded ${nextItems.length} fulfillment record(s).`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load fulfillments.");
    } finally {
      setHasLoadedOnce(true);
      setIsLoading(false);
    }
  }, [selectedId]);

  const saveItem = useCallback(async () => {
    if (!selectedId) {
      setStatusMessage("Select a fulfillment record first.");
      return;
    }

    if (fulfillmentStatus === "shipped") {
      const readiness = getDraftShippingReadiness({
        shippingFullName,
        shippingLine1,
        shippingCity,
        shippingCountry,
        carrier,
        trackingNumber,
      });

      if (!readiness.canShip) {
        const reasons = [
          readiness.missingTrackingNumber ? "tracking number" : null,
          readiness.missingAddressFields.length > 0 ? `address fields: ${readiness.missingAddressFields.join(", ")}` : null,
        ].filter(Boolean).join(" and ");
        setStatusMessage(`Cannot save as shipped. Missing ${reasons}.`);
        return;
      }

      const confirmed = window.confirm("Save this fulfillment as shipped?");
      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const sourceItem = items.find((item) => item.checkout_intent_id === selectedId);
      if (!sourceItem) {
        throw new Error("Selected fulfillment record no longer exists.");
      }

      const updated = await applyItemUpdate(sourceItem, {
        fulfillment_status: fulfillmentStatus,
        carrier,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        notes,
        estimated_delivery: estimatedDelivery || null,
        shipping_full_name: shippingFullName,
        shipping_phone: shippingPhone,
        shipping_line1: shippingLine1,
        shipping_line2: shippingLine2,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_postal_code: shippingPostalCode,
        shipping_country: shippingCountry,
      });

      const nextItems = items.map((item) =>
        item.checkout_intent_id === selectedId ? updated : item
      );
      setItems(nextItems);
      setStatusMessage("Fulfillment updated.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save fulfillment.");
    } finally {
      setIsSaving(false);
    }
  }, [applyItemUpdate, carrier, estimatedDelivery, fulfillmentStatus, items, notes, selectedId, shippingCity, shippingCountry, shippingFullName, shippingLine1, shippingLine2, shippingPhone, shippingPostalCode, shippingState, trackingNumber, trackingUrl]);

  return (
    <AdminToolShell
      title="Member Cards"
      subtitle="Review queued cards, shipping addresses, and tracking details from the admin workspace."
    >
      <section className="mx-auto w-full max-w-6xl rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-5 md:p-7">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-black text-[#D7F27A]">Admin: Member Cards</h2>
            <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!hasLoadedOnce || sortedItems.length === 0}
                className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export CSV
              </button>
              <div className="w-full sm:w-[220px]">
                <Button type="button" onClick={loadItems} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load Fulfillments"}
                </Button>
              </div>
            </div>
          </div>

          {hasLoadedOnce ? (
            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Queued" value={String(summary.queued)} />
              <SummaryCard label="Delayed" value={String(summary.delayed)} tone="text-red-200" />
              <SummaryCard label="Shipped Today" value={String(summary.shippedToday)} tone="text-violet-200" />
              <SummaryCard label="Delivered" value={String(summary.delivered)} tone="text-emerald-200" />
            </section>
          ) : null}

          {hasLoadedOnce ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Input id="memberCardSearch" label="Search" placeholder="Email, user, intent, tracking..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <SelectField label="Plan" value={tierFilter} onChange={setTierFilter} options={["all", "Silver", "Hash Pro", "Titan Elite"]} />
                <SelectField label="Fulfillment" value={statusFilter} onChange={setStatusFilter} options={["all", ...STATUSES]} />
                <SelectField label="Country" value={countryFilter} onChange={setCountryFilter} options={["all", ...countryOptions]} />
                <SelectField label="Payment" value={paymentFilter} onChange={setPaymentFilter} options={["all", ...paymentStatusOptions]} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                <p>Showing {sortedItems.length} of {items.length} record(s).</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setTierFilter("all");
                    setStatusFilter("all");
                    setCountryFilter("all");
                    setPaymentFilter("all");
                  }}
                  className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : null}

          {hasLoadedOnce ? (
            <div className={`grid gap-4 ${sortedItems.length > 0 ? "lg:grid-cols-[340px_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 max-h-[560px] overflow-y-auto">
                {sortedItems.length === 0 ? (
                  <p className="text-sm text-white/55">No fulfillment records match the current filters.</p>
                ) : (
                  sortedItems.map((item) => (
                      (() => {
                        const readiness = getShippingReadiness(item);
                        return (
                    <div
                      key={item.checkout_intent_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(item.checkout_intent_id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(item.checkout_intent_id);
                        }
                      }}
                      className={`cursor-pointer w-full rounded-lg border px-3 py-3 text-left text-sm ${
                        selectedId === item.checkout_intent_id
                          ? "border-[#C9EB55]/35 bg-[#C9EB55]/10 text-[#C9EB55]"
                          : "border-white/10 bg-black/20 text-white/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{item.card_label}</div>
                          <div className="mt-1 text-xs text-white/60">{item.shipping_email || item.user_id}</div>
                        </div>
                        <Badge label={item.tier} kind="tier" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <PriorityBadge item={item} />
                        <Badge label={item.fulfillment_status} kind="fulfillment" />
                        <Badge label={item.payment_status || "unknown"} kind="payment" />
                        {readiness.missingTrackingNumber && (item.fulfillment_status === "queued" || item.fulfillment_status === "in_production") ? <WarningBadge label="Tracking Required" /> : null}
                        {readiness.missingAddressFields.length > 0 ? <WarningBadge label="Address Incomplete" /> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.fulfillment_status === "queued" ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void runQuickAction(item, "in_production");
                            }}
                            className="cursor-pointer rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100"
                          >
                            Mark In Production
                          </button>
                        ) : null}
                        {(item.fulfillment_status === "queued" || item.fulfillment_status === "in_production") ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void runQuickAction(item, "shipped");
                            }}
                            disabled={!readiness.canShip}
                            className="cursor-pointer rounded-full border border-violet-300/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100"
                          >
                            Mark Shipped
                          </button>
                        ) : null}
                        {item.fulfillment_status === "shipped" ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void runQuickAction(item, "delivered");
                            }}
                            className="cursor-pointer rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100"
                          >
                            Mark Delivered
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/55">
                        <span>{formatMoney(item.amount_usd, item.currency)}</span>
                        <span>{formatDateTime(item.purchase_date)}</span>
                      </div>
                    </div>
                      );
                    })()
                  ))
                )}
              </div>

              {sortedItems.length > 0 ? <div className="space-y-4">
              {selectedItem ? (
                <>
                  {(() => {
                    const readiness = getShippingReadiness(selectedItem);
                    return readiness.missingTrackingNumber || readiness.missingAddressFields.length > 0 || readiness.missingCarrier ? (
                      <div className="rounded-xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
                        <p className="font-semibold uppercase tracking-[0.14em]">Shipping Readiness</p>
                        {readiness.missingTrackingNumber ? <p className="mt-2">Tracking number is missing.</p> : null}
                        {readiness.missingCarrier ? <p className="mt-2">Carrier is missing.</p> : null}
                        {readiness.missingAddressFields.length > 0 ? <p className="mt-2">Address is incomplete: {readiness.missingAddressFields.join(", ")}.</p> : null}
                      </div>
                    ) : null;
                  })()}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75 break-words">
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge item={selectedItem} />
                      <Badge label={selectedItem.tier} kind="tier" />
                      <Badge label={selectedItem.fulfillment_status} kind="fulfillment" />
                      <Badge label={selectedItem.payment_status || "unknown"} kind="payment" />
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div>User: {selectedItem.user_id}</div>
                      <div>Email: {selectedItem.shipping_email || "-"}</div>
                      <div>Purchased Plan: {selectedItem.tier}</div>
                      <div>Card Type: {selectedItem.card_label}</div>
                      <div>Payment Provider: {selectedItem.payment_provider || "-"}</div>
                      <div>Payment Status: {selectedItem.payment_status || "-"}</div>
                      <div>Amount Paid: {formatMoney(selectedItem.amount_usd, selectedItem.currency)}</div>
                      <div>Purchase Date: {formatDateTime(selectedItem.purchase_date)}</div>
                      <div className="md:col-span-2">Checkout Intent: {selectedItem.checkout_intent_id}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyValue("Email", selectedItem.shipping_email || "")}
                        className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                      >
                        Copy Email
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyValue("Checkout Intent", selectedItem.checkout_intent_id)}
                        className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                      >
                        Copy Intent
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyValue("Tracking Number", selectedItem.tracking_number || "")}
                        className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                      >
                        Copy Tracking
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyValue("Shipping Address", formatShippingAddress(selectedItem))}
                        className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                      >
                        Copy Address
                      </button>
                      <Link
                        href={`/admin/dashboard/miner-review/${encodeURIComponent(selectedItem.user_id)}`}
                        className="rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#D7F27A]"
                      >
                        Open Miner Review
                      </Link>
                      {selectedItem.tracking_url ? (
                        <a
                          href={selectedItem.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                        >
                          Open Tracking
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-white/70">Fulfillment Status</label>
                      <select
                        value={fulfillmentStatus}
                        onChange={(e) => setFulfillmentStatus(e.target.value as FulfillmentItem["fulfillment_status"])}
                        className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white"
                      >
                        {STATUSES.map((value) => (
                          <option key={value} className="bg-black" value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input id="carrier" label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                  </div>

                  <Input id="trackingNumber" label="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input id="trackingUrl" label="Tracking URL" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
                    <Input id="estimatedDelivery" label="Estimated Delivery" type="datetime-local" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="notes" className="mb-2 text-sm text-white/70">Internal Notes</label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white placeholder-white/40 focus:border-[#C9EB55] focus:outline-none focus:ring-1 focus:ring-[#C9EB55]/30"
                      placeholder="Packaging notes, courier notes, handoff details..."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input id="shippingFullName" label="Shipping Full Name" value={shippingFullName} onChange={(e) => setShippingFullName(e.target.value)} />
                    <Input id="shippingPhone" label="Shipping Phone" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} />
                  </div>

                  <Input id="shippingLine1" label="Address Line 1" value={shippingLine1} onChange={(e) => setShippingLine1(e.target.value)} />
                  <Input id="shippingLine2" label="Address Line 2" value={shippingLine2} onChange={(e) => setShippingLine2(e.target.value)} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input id="shippingCity" label="City" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
                    <Input id="shippingState" label="State / Region" value={shippingState} onChange={(e) => setShippingState(e.target.value)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input id="shippingPostalCode" label="Postal Code" value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} />
                    <Input id="shippingCountry" label="Country" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} />
                  </div>

                  <Button type="button" onClick={saveItem} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Fulfillment"}
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-white/55">
                  Select a fulfillment record to view and edit details.
                </div>
              )}
            </div> : null}
            </div>
          ) : null}

          {statusMessage ? <div className="text-sm text-white/60">{statusMessage}</div> : null}
        </div>
      </section>
    </AdminToolShell>
  );
}
