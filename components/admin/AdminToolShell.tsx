"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { PageShell } from "@/components/dashboard/v2/PageShell";
import AdminDashboardLinks from "@/components/dashboard/v2/AdminDashboardLinks";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

type AdminToolShellProps = {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  backHref?: string | null;
  showLinks?: boolean;
};

type AdminNotificationsChangedEvent = CustomEvent<{ unreadCount?: number }>;

export default function AdminToolShell({
  title,
  subtitle,
  children,
  backHref = "/admin/dashboard",
  showLinks = false,
}: AdminToolShellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const response = await fetch("/api/admin/notifications?unread=true", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { notifications?: Array<unknown> };
        if (!cancelled) {
          setUnreadCount(Array.isArray(payload.notifications) ? payload.notifications.length : 0);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnreadCount();
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    function handleNotificationsChanged(event: Event) {
      const detail = (event as AdminNotificationsChangedEvent).detail;
      if (typeof detail?.unreadCount === "number") {
        setUnreadCount(Math.max(0, detail.unreadCount));
        return;
      }

      void loadUnreadCount();
    }

    window.addEventListener("admin-notifications-changed", handleNotificationsChanged);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("admin-notifications-changed", handleNotificationsChanged);
    };
  }, []);

  return (
    <PageShell title={title} subtitle={subtitle} backHref={backHref}>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard/notifications")}
          className="relative cursor-pointer rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white/80 transition-colors hover:text-white"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-red-300/30 bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
        <AdminLogoutButton />
      </div>
      {showLinks ? <AdminDashboardLinks /> : null}
      {children}
    </PageShell>
  );
}
