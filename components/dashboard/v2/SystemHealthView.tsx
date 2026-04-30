"use client";

import Link from "next/link";
import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import HashrateWriterStatus from "@/components/dashboard/v2/HashrateWriterStatus";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";
import { useEffect, useMemo, useState } from "react";

type HealthPayload = { status: string; checks: { redis: boolean; rabbitmq: boolean }; at?: string };
type QueuePayload = { queue: string; messages: number; consumers: number; at?: string };

type SourcePayload = { throughputPerSec: number; errors: number; connections: number; at?: string; ok?: boolean; error?: string; enabled?: boolean; message?: string; status?: string };

type HealthStatusPayload = HealthPayload & { enabled?: boolean; message?: string };
const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

type AlertTone = "high" | "medium" | "low";
type AlertGroup = "critical" | "warning" | "info";
type NotificationItem = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
  link: string | null;
};

function formatUpdatedAt(value?: string) {
  if (!value) return "Not loaded yet";
  return new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function formatTimeAgo(value: string) {
  const createdAt = new Date(value).getTime();
  const diffSeconds = Math.round((createdAt - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffSeconds) < 60) {
    return formatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export default function SystemHealthView({ backHref = "/dashboard" }: { backHref?: string }) {
  const staticLoadOptions = { intervalMs: 30000, enableWebSocket: false } as const;
  const health = useRealtimeMiningData<HealthStatusPayload>(runtimeMetricsEnabled ? "/api/mining/health" : null, staticLoadOptions);
  const queue = useRealtimeMiningData<QueuePayload>("/api/mining/queue", staticLoadOptions);
  const rest = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/rest" : null, staticLoadOptions);
  const ws = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/ws" : null, staticLoadOptions);
  const stratum = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/stratum" : null, staticLoadOptions);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(Date.now());
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const alerts = useMemo(() => {
    const rows: Array<{ tone: AlertTone; group: AlertGroup; message: string }> = [];

    if (!runtimeMetricsEnabled) {
      rows.push({ tone: "low", group: "info", message: "Mining runtime metrics and health checks are disabled during build stage." });
    }

    if (runtimeMetricsEnabled && health.error) {
      rows.push({ tone: "high", group: "critical", message: `System health check failed: ${health.error}` });
    } else if (runtimeMetricsEnabled && health.data?.status === "disabled") {
      rows.push({ tone: "low", group: "info", message: health.data.message || "Mining health checks are disabled during build stage." });
    } else if (runtimeMetricsEnabled && health.data?.status && health.data.status !== "ok") {
      rows.push({ tone: "high", group: "critical", message: `System status is ${health.data.status}.` });
    }

    if (queue.error) {
      rows.push({ tone: "medium", group: "warning", message: `Queue monitoring failed: ${queue.error}` });
    } else if ((queue.data?.consumers ?? 0) === 0) {
      rows.push({ tone: "medium", group: "warning", message: "Queue has zero consumers." });
    } else if ((queue.data?.messages ?? 0) > 0) {
      rows.push({ tone: "medium", group: "warning", message: `Queue depth is ${queue.data?.messages ?? 0} message(s).` });
    }

    if (runtimeMetricsEnabled && rest.error) {
      rows.push({ tone: "medium", group: "warning", message: `REST metrics unavailable: ${rest.error}` });
    } else if (runtimeMetricsEnabled && rest.data?.status === "disabled") {
      rows.push({ tone: "low", group: "info", message: rest.data.message || "REST metrics are disabled during build stage." });
    } else if (runtimeMetricsEnabled && (rest.data?.errors ?? 0) > 0) {
      rows.push({ tone: "medium", group: "warning", message: `REST reported ${rest.data?.errors ?? 0} error(s).` });
    }
    if (runtimeMetricsEnabled && ws.error) {
      rows.push({ tone: "medium", group: "warning", message: `WebSocket metrics unavailable: ${ws.error}` });
    } else if (runtimeMetricsEnabled && ws.data?.status === "disabled") {
      rows.push({ tone: "low", group: "info", message: ws.data.message || "WebSocket metrics are disabled during build stage." });
    } else if (runtimeMetricsEnabled && (ws.data?.errors ?? 0) > 0) {
      rows.push({ tone: "medium", group: "warning", message: `WebSocket reported ${ws.data?.errors ?? 0} error(s).` });
    }
    if (runtimeMetricsEnabled && stratum.error) {
      rows.push({ tone: "medium", group: "warning", message: `Stratum metrics unavailable: ${stratum.error}` });
    } else if (runtimeMetricsEnabled && stratum.data?.status === "disabled") {
      rows.push({ tone: "low", group: "info", message: stratum.data.message || "Stratum metrics are disabled during build stage." });
    } else if (runtimeMetricsEnabled && (stratum.data?.errors ?? 0) > 0) {
      rows.push({ tone: "medium", group: "warning", message: `Stratum reported ${stratum.data?.errors ?? 0} error(s).` });
    }

    return rows;
  }, [health.data, health.error, queue.data, queue.error, rest.data, rest.error, stratum.data, stratum.error, ws.data, ws.error]);

  const alertToneClass: Record<AlertTone, string> = {
    high: "border-red-400/35 bg-red-500/10 text-red-100",
    medium: "border-amber-400/35 bg-amber-500/10 text-amber-100",
    low: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  };

  const groupedAlerts = useMemo(
    () => ({
      critical: alerts.filter((alert) => alert.group === "critical"),
      warning: alerts.filter((alert) => alert.group === "warning"),
      info: alerts.filter((alert) => alert.group === "info"),
    }),
    [alerts],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsSinceRefresh(Math.max(0, Math.floor((Date.now() - lastRefreshAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lastRefreshAt]);

  useEffect(() => {
    const latestTimestamp = [health.data?.at, queue.data?.at, rest.data?.at, ws.data?.at, stratum.data?.at]
      .map((value) => (value ? new Date(value).getTime() : 0))
      .reduce((latest, value) => Math.max(latest, value), 0);

    if (latestTimestamp > 0) {
      setLastRefreshAt(latestTimestamp);
    }
  }, [health.data?.at, queue.data?.at, rest.data?.at, ws.data?.at, stratum.data?.at]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/admin/notifications?unread=true", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; notifications?: NotificationItem[] }
          | null;

        if (!response.ok || !payload?.ok) {
          if (!cancelled) setNotifications([]);
          return;
        }

        if (!cancelled) {
          setNotifications(Array.isArray(payload.notifications) ? payload.notifications.slice(0, 5) : []);
        }
      } catch {
        if (!cancelled) setNotifications([]);
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAll() {
    setRefreshing(true);
    try {
      await Promise.all([
        health.reload(),
        queue.reload(),
        rest.reload(),
        ws.reload(),
        stratum.reload(),
      ]);
      setLastRefreshAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <PageShell title="System Health" subtitle="Health checks, queue state, errors, throughput, and active connections." backHref={backHref}>
      <section className="flex justify-end">
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="cursor-pointer rounded-full border border-[#C9EB55]/25 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#D7F27A] hover:bg-[#C9EB55]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh Now"}
          </button>
          <p className="text-xs text-white/45">Last updated: {secondsSinceRefresh}s ago</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-[#C9EB55]">Alerts</h2>
            <p className="text-sm text-white/60">Live operational flags based on the latest manual refresh.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">
            Last loaded: {formatUpdatedAt(health.data?.at || queue.data?.at || rest.data?.at || ws.data?.at || stratum.data?.at)}
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {alerts.length === 0 ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${alertToneClass.low}`}>
              All checks loaded successfully. No active alerts.
            </div>
          ) : null}

          {groupedAlerts.critical.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">🔴 Critical</p>
              {groupedAlerts.critical.map((alert, index) => (
                <div key={`${alert.message}-${index}`} className={`rounded-xl border px-4 py-3 text-sm ${alertToneClass.high}`}>
                  {alert.message}
                </div>
              ))}
            </div>
          ) : null}

          {groupedAlerts.warning.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">🟡 Warning</p>
              {groupedAlerts.warning.map((alert, index) => (
                <div key={`${alert.message}-${index}`} className={`rounded-xl border px-4 py-3 text-sm ${alertToneClass.medium}`}>
                  {alert.message}
                </div>
              ))}
            </div>
          ) : null}

          {groupedAlerts.info.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">🔵 Info</p>
              {groupedAlerts.info.map((alert, index) => (
                <div key={`${alert.message}-${index}`} className="rounded-xl border border-sky-400/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                  {alert.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Status" value={String(health.data?.status || "unknown")} />
        <StatCard label="Redis" value={health.data?.status === "disabled" ? "DISABLED" : health.data?.checks?.redis ? "UP" : "DOWN"} />
        <StatCard label="RabbitMQ" value={health.data?.status === "disabled" ? "DISABLED" : health.data?.checks?.rabbitmq ? "UP" : "DOWN"} />
        <StatCard label="Queue Depth" value={String(queue.data?.messages || 0)} />
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Queue Monitoring</h2>
        {queue.loading ? <p className="text-sm text-white/55">Loading queue data...</p> : null}
        {queue.error ? <p className="text-sm text-red-200">Queue error: {queue.error}</p> : null}
        {!queue.loading && !queue.error ? (
          <>
            <p className="text-sm text-white/75">Queue: {queue.data?.queue || "-"}</p>
            <p className="text-sm text-white/75">Messages: {queue.data?.messages ?? 0}</p>
            <p className="text-sm text-white/75">Consumers: {queue.data?.consumers ?? 0}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/40">Updated: {formatUpdatedAt(queue.data?.at)}</p>
          </>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SourceCard title="REST" data={rest.data} loading={rest.loading} error={rest.error} />
        <SourceCard title="WebSocket" data={ws.data} loading={ws.loading} error={ws.error} />
        <SourceCard title="Stratum" data={stratum.data} loading={stratum.loading} error={stratum.error} />
      </section>

      <HashrateWriterStatus />

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-[#C9EB55]">Recent Notifications</h2>
            <p className="text-sm text-white/60">Latest unread admin alerts and follow-up items.</p>
          </div>
          <Link
            href="/admin/dashboard/notifications"
            className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80"
          >
            View All
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
              No new notifications.
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        notification.severity === "critical"
                          ? "border-red-400/35 bg-red-500/10 text-red-100"
                          : notification.severity === "high"
                            ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
                            : notification.severity === "medium"
                              ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-100"
                              : "border-sky-400/35 bg-sky-500/10 text-sky-100"
                      }`}
                    >
                      {notification.severity}
                    </span>
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80"
                    >
                      View
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}

function SourceCard({ title, data, loading, error }: { title: string; data?: SourcePayload | null; loading: boolean; error: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/20 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{title}</p>
      {loading ? <p className="mt-3 text-sm text-white/55">Loading metrics...</p> : null}
      {error ? <p className="mt-3 text-sm text-red-200">Unavailable: {error}</p> : null}
      {!loading && !error ? (
        <>
          {data?.message ? <p className="mt-3 text-sm text-white/55">{data.message}</p> : null}
          <p className="mt-3 text-sm text-white/70">Throughput: {(data?.throughputPerSec || 0).toFixed(2)}/s</p>
          <p className="text-sm text-white/70">Connections: {data?.connections || 0}</p>
          <p className="text-sm text-white/70">Errors: {data?.errors || 0}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/40">Updated: {formatUpdatedAt(data?.at)}</p>
        </>
      ) : null}
    </div>
  );
}
