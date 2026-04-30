"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import Button from "@/components/ui/Button";

function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [done, setDone] = useState(false);

  const verify = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1400);
    }
  }, [token, router]);

  return (
    <AuthCard title="Verify email" subtitle="Complete verification">
      <div className="flex flex-col gap-5">
        <Button onClick={verify}>Verify now</Button>
        {done && <div className="text-sm text-white/60">Verified — redirecting to login.</div>}
      </div>
    </AuthCard>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading verification...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
