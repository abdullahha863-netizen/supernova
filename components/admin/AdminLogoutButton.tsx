"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    localStorage.removeItem("sn_auth");
    localStorage.removeItem("sn_admin");
    sessionStorage.removeItem("sn_auth");
    sessionStorage.removeItem("sn_admin");
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="cursor-pointer rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-200"
    >
      Logout
    </button>
  );
}
