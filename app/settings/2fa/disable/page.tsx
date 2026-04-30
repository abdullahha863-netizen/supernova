"use client";

import { useCallback, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import CodeInput from "@/components/ui/CodeInput";
import Button from "@/components/ui/Button";

export default function Disable2FA() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const disable = useCallback(async () => {
    setStatus(null);
    const res = await fetch("/api/auth/2fa/disable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const json = await res.json();
    if (res.ok) setStatus("2FA disabled"); else setStatus(json?.error || "Failed to disable");
  }, [code]);

  return (
    <AuthCard title="Disable Two‑Factor" subtitle="Confirm with your authenticator app">
      <div className="flex flex-col gap-4">
        <label className="text-sm text-white/70">Enter current code</label>
        <CodeInput value={code} onChange={setCode} />
        <Button onClick={disable} disabled={code.length < 6}>Disable 2FA</Button>
        {status && <div className="text-sm text-white/60">{status}</div>}
      </div>
    </AuthCard>
  );
}
