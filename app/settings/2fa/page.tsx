"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import AuthCard from "@/components/auth/AuthCard";
import Button from "@/components/ui/Button";
import CodeInput from "@/components/ui/CodeInput";
import QRCode from "qrcode";

export default function Settings2FA() {
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/auth/2fa/setup");
      if (!res.ok) {
        setStatus("Unable to initialize 2FA setup");
        return;
      }
      const json = await res.json();
      setOtpauth(json.otpauthUrl);
      setSecret(json.secret);
    }
    init();
  }, []);

  useEffect(() => {
    if (!otpauth) return;
    QRCode.toDataURL(otpauth, { margin: 1, width: 240 }).then(setQrDataUrl).catch(() => setStatus("Failed to render QR"));
  }, [otpauth]);

  const verify = useCallback(async () => {
    setStatus(null);
    const res = await fetch("/api/auth/2fa/setup/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (res.ok) {
      setStatus("2FA enabled");
    } else {
      const j = await res.json();
      setStatus(j?.error || "Verification failed");
    }
  }, [code]);

  return (
    <AuthCard title="Two‑Factor Setup" subtitle="Secure your account with an authenticator app">
      <div className="flex flex-col gap-6">
        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-4">
            <Image src={qrDataUrl} alt="TOTP QR code" className="h-48 w-48 rounded-md" width={240} height={240} unoptimized />
            <div className="text-sm text-white/60">Scan the QR with your authenticator app</div>
          </div>
        ) : (
          <div className="text-sm text-white/60">Generating QR…</div>
        )}

        {secret && (
          <div className="text-sm text-white/60 break-all">Secret: <span className="text-white/90">{secret}</span></div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-sm text-white/70">Enter code from app</label>
          <CodeInput value={code} onChange={setCode} />
          <Button onClick={verify} disabled={code.length < 6}>Verify & enable</Button>
          {status && <div className="text-sm text-white/60">{status}</div>}
        </div>
      </div>
    </AuthCard>
  );
}
