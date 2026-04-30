"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminToolShell from "@/components/admin/AdminToolShell";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  read: boolean;
  createdAt: string;
  link: string | null;
};

type NotificationsResponse = {
  ok: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  error?: string;
};

type NotificationActionResponse = {
  ok: boolean;
  unreadCount?: number;
  updatedCount?: number;
  deletedCount?: number;
  error?: string;
};

type NotificationToast = Pick<NotificationItem, "id" | "title" | "message" | "read" | "link">;

const severityStyles: Record<NotificationItem["severity"], string> = {
  critical: "border-red-400/30 bg-red-500/15 text-red-100",
  high: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  medium: "border-yellow-400/30 bg-yellow-500/15 text-yellow-100",
  low: "border-blue-400/30 bg-blue-500/15 text-blue-100",
};

function formatTimeAgo(value: string) {
  const createdAt = new Date(value).getTime();
  const now = Date.now();
  const diffMs = now - createdAt;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(-diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(-diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatter.format(-diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(-diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return formatter.format(-diffYears, "year");
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlightedNotificationIds, setHighlightedNotificationIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const hasLoadedNotificationsRef = useRef(false);
  const notificationIdsRef = useRef<Set<string>>(new Set());
  const alreadyHighlightedNotificationIdsRef = useRef<Set<string>>(new Set());
  const highlightTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeToastClickIdsRef = useRef<Set<string>>(new Set());
  const lastNotificationSoundAtRef = useRef(0);
  const unreadCountRef = useRef(0);
  const isViewingDetailRef = useRef(false);
  const [unreadOnly] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("unread") === "true",
  );

  function updateNotifications(nextNotifications: NotificationItem[]) {
    notificationIdsRef.current = new Set(nextNotifications.map((notification) => notification.id));
    setNotifications(nextNotifications);
  }

  function formatToastMessage(message: string) {
    const normalized = message.trim().replace(/\s+/g, " ");
    return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
  }

  function playNewNotificationSound() {
    try {
      const now = Date.now();
      if (now - lastNotificationSoundAtRef.current < 1500) return;

      lastNotificationSoundAtRef.current = now;

      const AudioContextConstructor =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.08);
      window.setTimeout(() => void audioContext.close().catch(() => undefined), 160);
    } catch {
      // Browser autoplay policies can block notification sounds.
    }
  }

  function highlightNewNotifications(notificationIds: string[]) {
    if (notificationIds.length === 0) return;

    setHighlightedNotificationIds((current) => Array.from(new Set([...current, ...notificationIds])));

    notificationIds.forEach((notificationId) => {
      const existingTimeout = highlightTimeoutsRef.current.get(notificationId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        highlightTimeoutsRef.current.delete(notificationId);
        setHighlightedNotificationIds((current) => current.filter((id) => id !== notificationId));
      }, 4500);

      highlightTimeoutsRef.current.set(notificationId, timeout);
    });
  }

  function dismissToast(notificationId: string) {
    activeToastClickIdsRef.current.delete(notificationId);

    const existingTimeout = toastTimeoutsRef.current.get(notificationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      toastTimeoutsRef.current.delete(notificationId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== notificationId));
  }

  function scheduleToastDismiss(notificationId: string, delayMs = 4000) {
    const existingTimeout = toastTimeoutsRef.current.get(notificationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      dismissToast(notificationId);
    }, delayMs);

    toastTimeoutsRef.current.set(notificationId, timeout);
  }

  function showNewNotificationToasts(newNotifications: NotificationItem[]) {
    if (newNotifications.length === 0) return;

    const nextToastItems: NotificationToast[] = newNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      link: notification.link,
    }));

    setToasts((current) => {
      const merged = [
        ...nextToastItems,
        ...current.filter((toast) => !nextToastItems.some((nextToast) => nextToast.id === toast.id)),
      ].slice(0, 3);
      const visibleToastIds = new Set(merged.map((toast) => toast.id));

      toastTimeoutsRef.current.forEach((timeout, notificationId) => {
        if (!visibleToastIds.has(notificationId)) {
          clearTimeout(timeout);
          toastTimeoutsRef.current.delete(notificationId);
        }
      });

      return merged;
    });

    nextToastItems.slice(0, 3).forEach((toast) => {
      scheduleToastDismiss(toast.id);
    });
  }

  useEffect(() => {
    let cancelled = false;
    let activeController: AbortController | null = null;

    async function pollNotifications() {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const params = new URLSearchParams({ limit: "20" });
        if (unreadOnly) {
          params.set("unread", "true");
        }

        const response = await fetch(`/api/admin/notifications?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as NotificationsResponse | null;

        if (!response.ok || !payload?.ok) {
          return;
        }

        const nextUnreadCount =
          typeof payload.unreadCount === "number"
            ? payload.unreadCount
            : Array.isArray(payload.notifications)
              ? payload.notifications.filter((notification) => !notification.read).length
              : unreadCountRef.current;
        const isFirstSuccessfulFetch = !hasLoadedNotificationsRef.current;
        const nextNotifications = Array.isArray(payload.notifications) ? payload.notifications : [];

        if (!cancelled && !isViewingDetailRef.current) {
          const newNotificationIds = isFirstSuccessfulFetch
            ? []
            : nextNotifications
                .filter(
                  (notification) =>
                    !notificationIdsRef.current.has(notification.id) &&
                    !alreadyHighlightedNotificationIdsRef.current.has(notification.id),
                )
                .map((notification) => notification.id);
          const shouldUpdate =
            !hasLoadedNotificationsRef.current ||
            nextUnreadCount !== unreadCountRef.current ||
            newNotificationIds.length > 0;

          if (shouldUpdate) {
            updateNotifications(nextNotifications);
            setUnreadCount(nextUnreadCount);
            unreadCountRef.current = nextUnreadCount;
            notifyUnreadCountChanged(nextUnreadCount);
          }

          if (newNotificationIds.length > 0) {
            newNotificationIds.forEach((notificationId) => {
              alreadyHighlightedNotificationIdsRef.current.add(notificationId);
            });
            highlightNewNotifications(newNotificationIds);
            showNewNotificationToasts(
              nextNotifications.filter((notification) => newNotificationIds.includes(notification.id)),
            );
            playNewNotificationSound();
          }
        }

        if (!cancelled && isFirstSuccessfulFetch) {
          hasLoadedNotificationsRef.current = true;
        }

        if (!cancelled && isFirstSuccessfulFetch) {
          setLoading(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("[admin/notifications][poll]", error);
      } finally {
        if (activeController === controller) {
          activeController = null;
        }
      }
    }

    void pollNotifications();
    const intervalId = setInterval(() => {
      void pollNotifications();
    }, 25000);

    return () => {
      cancelled = true;
      activeController?.abort();
      highlightTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      highlightTimeoutsRef.current.clear();
      toastTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      toastTimeoutsRef.current.clear();
      clearInterval(intervalId);
    };
  }, [unreadOnly]);

  function notifyUnreadCountChanged(count: number) {
    window.dispatchEvent(
      new CustomEvent("admin-notifications-changed", {
        detail: { unreadCount: Math.max(0, count) },
      }),
    );
  }

  function setViewingDetail(value: boolean) {
    isViewingDetailRef.current = value;
    setIsViewingDetail(value);
  }

  function updateUnreadCount(count: number) {
    const nextCount = Math.max(0, count);
    unreadCountRef.current = nextCount;
    setUnreadCount(nextCount);
    notifyUnreadCountChanged(nextCount);
  }

  async function markAsRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.read) return true;

    const previous = notifications;
    const previousUnreadCount = previous.filter((notification) => !notification.read).length;

    updateNotifications(
      unreadOnly
        ? notifications.filter((notification) => notification.id !== id)
        : notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification,
          ),
    );
    updateUnreadCount(previousUnreadCount - 1);

    try {
      const response = await fetch(`/api/admin/notifications/${id}/read`, {
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as NotificationActionResponse | null;

      if (!response.ok || !payload?.ok) {
        setNotifications(previous);
        notificationIdsRef.current = new Set(previous.map((notification) => notification.id));
        updateUnreadCount(previousUnreadCount);
        return false;
      }

      if (typeof payload.unreadCount === "number") {
        updateUnreadCount(payload.unreadCount);
      }

      return true;
    } catch {
      setNotifications(previous);
      notificationIdsRef.current = new Set(previous.map((notification) => notification.id));
      updateUnreadCount(previousUnreadCount);
      return false;
    }
  }

  async function openNotification(notification: NotificationItem) {
    setViewingDetail(true);

    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function handleToastClick(toast: NotificationToast) {
    if (activeToastClickIdsRef.current.has(toast.id)) return;
    activeToastClickIdsRef.current.add(toast.id);

    if (!toast.read) {
      await markAsRead(toast.id);
    }

    if (toast.link) {
      router.push(toast.link);
      dismissToast(toast.id);
      return;
    }

    scheduleToastDismiss(toast.id, 400);
  }

  async function markAllAsRead() {
    const unreadCount = notifications.filter((notification) => !notification.read).length;
    if (unreadCount === 0) return;

    const previous = notifications;
    setMarkingAll(true);
    updateNotifications(
      unreadOnly ? [] : notifications.map((notification) => ({ ...notification, read: true })),
    );
    updateUnreadCount(0);

    try {
      const response = await fetch("/api/admin/notifications/read-all", {
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as NotificationActionResponse | null;

      if (!response.ok || !payload?.ok) {
        setNotifications(previous);
        notificationIdsRef.current = new Set(previous.map((notification) => notification.id));
        updateUnreadCount(unreadCount);
        return;
      }

      updateUnreadCount(typeof payload.unreadCount === "number" ? payload.unreadCount : 0);
    } catch {
      setNotifications(previous);
      notificationIdsRef.current = new Set(previous.map((notification) => notification.id));
      updateUnreadCount(unreadCount);
    } finally {
      setMarkingAll(false);
    }
  }

  async function clearReadNotifications() {
    const readCount = notifications.filter((notification) => notification.read).length;
    if (readCount === 0) return;

    const previous = notifications;
    setClearingRead(true);
    updateNotifications(notifications.filter((notification) => !notification.read));

    try {
      const response = await fetch("/api/admin/notifications/clear-read", {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as NotificationActionResponse | null;

      if (!response.ok || !payload?.ok) {
        setNotifications(previous);
        notificationIdsRef.current = new Set(previous.map((notification) => notification.id));
        return;
      }

      if (typeof payload.unreadCount === "number") {
        updateUnreadCount(payload.unreadCount);
      }
    } catch {
      setNotifications(previous);
      notificationIdsRef.current = new Set(previous.map((notification) => notification.id));
    } finally {
      setClearingRead(false);
    }
  }

  const readCount = notifications.length - unreadCount;

  return (
    <>
      <AdminToolShell
        title="Notifications"
        subtitle="Operational alerts, system notices, and admin follow-up items."
      >
        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">Admin Inbox</p>
            <p className="mt-2 text-sm text-white/65">
              {loading ? "Loading notifications..." : `${notifications.length} total, ${unreadCount} unread`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={markingAll || unreadCount === 0}
              className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/80 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </button>
            <button
              type="button"
              onClick={() => void clearReadNotifications()}
              disabled={clearingRead || readCount === 0}
              className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/80 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {clearingRead ? "Clearing..." : "Clear read"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/60">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/60">
            {isViewingDetail ? "Notification detail open." : "No notifications yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 transition-colors ${
                  highlightedNotificationIds.includes(notification.id)
                    ? "border-[#C9EB55]/40 bg-[#C9EB55]/[0.1] text-white shadow-[0_0_0_1px_rgba(201,235,85,0.12)]"
                    : notification.read
                    ? "border-white/8 bg-black/20 text-white/72"
                    : "border-[#C9EB55]/22 bg-[#C9EB55]/[0.06] text-white"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${severityStyles[notification.severity]}`}
                      >
                        {notification.severity}
                      </span>
                      <span className="text-xs text-white/45">{formatTimeAgo(notification.createdAt)}</span>
                      {!notification.read ? (
                        <span className="rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7F36C]">
                          Unread
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">{notification.title}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">{notification.message}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={(event) => {
                          if (!notification.read) {
                            event.preventDefault();
                            void openNotification(notification);
                          }
                        }}
                        className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/80"
                      >
                        View
                      </Link>
                    ) : null}
                    {!notification.read ? (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification.id)}
                        className="rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#D7F36C]"
                      >
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        </section>
      </AdminToolShell>

      {toasts.length > 0 ? (
        <div className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
          {toasts.map((toast) => (
            <button
              key={toast.id}
              type="button"
              onClick={() => void handleToastClick(toast)}
              className="rounded-2xl border border-[#C9EB55]/25 bg-[#11170D]/95 p-4 text-left shadow-2xl shadow-black/35 backdrop-blur transition-colors hover:border-[#C9EB55]/40"
            >
              <p className="text-sm font-bold text-white">{toast.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/65">{formatToastMessage(toast.message)}</p>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
