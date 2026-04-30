"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || "Login failed");
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <AuthCard title="Admin Login" subtitle="Administrative access only">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input id="adminKey" label="Admin key" name="adminKey" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} required />
          <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>
      </AuthCard>
    </div>
  );
}
