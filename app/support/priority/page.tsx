"use client";

import { useEffect, useState, type FormEvent, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PrioritySupportPage() {
  const [isClient, setIsClient] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("Silver");
  const [membershipId, setMembershipId] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(() => !!fullName && !!email && !!membershipId && !!description && !!phone && consent, [fullName, email, membershipId, description, phone, consent]);
  const responseCopy = useMemo(() => {
    if (tier === "Titan Elite") return "Estimated response: Direct line, 1-5 hours";
    if (tier === "Hash Pro") return "Estimated response: 6-12 hours";
    return "Estimated response: 10-24 hours";
  }, [tier]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const ambientDots = useMemo(
    () =>
      isClient
        ? Array.from({ length: 200 }, () => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: Math.random() * 8 + 5,
            delay: Math.random() * 8,
          }))
        : [],
    [isClient]
  );

  const ambientStars = useMemo(
    () =>
      isClient
        ? Array.from({ length: 150 }, () => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 5,
          }))
        : [],
    [isClient]
  );

  async function uploadFirstAttachment() {
    const file = attachments[0];
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success || typeof payload.url !== "string") {
      throw new Error(payload?.message || "Attachment upload failed.");
    }

    return payload.url;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });
    setIsSubmitting(true);

    try {
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();
      const trimmedMembershipId = membershipId.trim();
      const trimmedDescription = description.trim();
      const trimmedPhone = phone.trim();

      if (!trimmedName || !trimmedEmail || !trimmedMembershipId || !trimmedDescription || !trimmedPhone) {
        setStatus({ type: "error", message: "Please complete all required fields before submitting." });
        setIsSubmitting(false);
        return;
      }

      if (!consent) {
        setStatus({ type: "error", message: "Please agree to direct contact for priority support." });
        setIsSubmitting(false);
        return;
      }

      const screenshotUrl = await uploadFirstAttachment();
      const payloadDescription = [
        `Submitted by: ${trimmedName}`,
        `Phone: ${trimmedPhone}`,
        `Membership level: ${tier}`,
        `Membership ID: ${trimmedMembershipId}`,
        "Issue:",
        trimmedDescription,
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Priority Support - ${tier} - ${trimmedName}`.slice(0, 160),
          email: trimmedEmail,
          priority: tier,
          description: payloadDescription,
          cardLast4: trimmedMembershipId,
          screenshotUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to submit priority support request.");
      }

      setStatus({ type: "success", message: "Request sent. Our priority desk will respond shortly." });
      setFullName("");
      setEmail("");
      setTier("Silver");
      setMembershipId("");
      setDescription("");
      setPhone("");
      setAttachments([]);
      setConsent(false);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to submit priority support request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative -mt-4 min-h-screen overflow-hidden bg-[#0A0A0F] pt-4 text-white md:-mt-6 md:pt-6">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {isClient && (
          <>
            {ambientDots.map((dot, i) => (
              <motion.div
                key={i}
                className="absolute h-[2px] w-[2px] rounded-full bg-[#C9EB55]/40"
                style={{
                  left: dot.left,
                  top: dot.top,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: dot.duration,
                  repeat: Infinity,
                  delay: dot.delay,
                  ease: "easeInOut",
                }}
              />
            ))}

            {ambientStars.map((star, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute h-[1px] w-[1px] rounded-full bg-white"
                style={{
                  left: star.left,
                  top: star.top,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: star.duration,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </div>

      <style>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.035);
          backdrop-filter: blur(12px) saturate(125%);
          border: 1px solid rgba(201, 235, 85, 0.18);
          box-shadow: 0 12px 40px rgba(201, 235, 85, 0.08), inset 0 0 24px rgba(201, 235, 85, 0.04);
        }
        .input-shell {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(201, 235, 85, 0.16);
        }
        .neon-headline {
          text-shadow: 0 0 30px rgba(201, 235, 85, 0.42);
        }

        @keyframes softBreathGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.04); }
        }

        .breathing-halo {
          animation: softBreathGlow 6.5s ease-in-out infinite;
        }
      `}</style>

      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-5 pb-10 md:pt-6 md:pb-14 space-y-14">
        <section className="text-center space-y-5">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-sm uppercase tracking-[0.32em] text-[#C9EB55]"
          >
            Priority Desk
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative inline-block"
          >
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-80 breathing-halo"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle at 30% 45%, rgba(201, 235, 85, 0.18), transparent 58%), radial-gradient(circle at 80% 30%, rgba(201, 235, 85, 0.12), transparent 60%)",
                filter: "blur(30px)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-70 breathing-halo"
              aria-hidden
              style={{
                background:
                  "linear-gradient(110deg, rgba(201, 235, 85, 0.04), rgba(201, 235, 85, 0.12), rgba(201, 235, 85, 0.04))",
                filter: "blur(32px)",
              }}
            />
            <h1 className="text-4xl md:text-6xl font-black neon-headline tracking-tight">
              Priority Support For Upgraded Members.
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
            className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto"
          >
            A faster support path for upgraded members who need quicker handling, clearer routing, and direct assistance when the issue is urgent.
          </motion.p>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glass-panel rounded-3xl p-8 md:p-10 space-y-6"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-[#C9EB55]">Request Priority Access</h2>
              <p className="text-white/55 text-sm">Response time depends on your current membership level.</p>
            </div>
            <Link
              href="/support"
              className="text-sm text-[#C9EB55] hover:text-[#d5f566] transition-colors"
            >
              ← Back to Support
            </Link>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Full Name</label>
                <input
                  type="text"
                  className="w-full rounded-2xl px-4 py-3 input-shell text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/60"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Email</label>
                <input
                  type="email"
                  className="w-full rounded-2xl px-4 py-3 input-shell text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/60"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">Phone Number (with country code)</label>
              <input
                type="tel"
                className="w-full rounded-2xl px-4 py-3 input-shell text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/60"
                placeholder="+1 415 555 0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_0.8fr] gap-5">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Membership Level</label>
                <select
                  className="w-full rounded-2xl px-4 py-3 input-shell text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/60"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  required
                >
                  <option className="bg-black" value="Silver">Silver</option>
                  <option className="bg-black" value="Hash Pro">Hash Pro</option>
                  <option className="bg-black" value="Titan Elite">Titan Elite</option>
                </select>
                <p className="text-xs text-[#C9EB55]/80 pt-1">{responseCopy}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Membership ID</label>
                <input
                  type="text"
                  className="w-full rounded-2xl px-4 py-3 input-shell text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/60"
                  placeholder="Enter your ID"
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">Issue Description</label>
              <div className="rounded-2xl input-shell p-3 space-y-3">
                <textarea
                  className="w-full rounded-xl px-4 py-3 bg-transparent text-white placeholder-white/40 focus:outline-none min-h-[160px]"
                  placeholder="Describe the incident, urgency, and any observed impact"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
                  <div className="text-xs text-white/45">
                    Attach one screenshot if it helps explain the issue. PNG, JPG, or JPEG only, up to 5MB.
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C9EB55]/30 bg-[#C9EB55]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9EB55] hover:bg-[#C9EB55]/15 transition-all duration-300">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
                    />
                    Upload Image
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="rounded-xl border border-[#C9EB55]/16 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9EB55]/75 mb-2">
                      Attached File
                    </p>
                    <div className="space-y-1 text-sm text-white/70">
                      <p>{attachments[0].name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 text-white/60 text-sm">
              <p>A support specialist may contact you directly through the appropriate support channel for faster handling.</p>
              <p className="text-white/50 text-xs">This service supports all languages.</p>
            </div>

            <label className="flex items-start gap-3 text-sm text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border border-white/30 bg-black text-[#C9EB55] focus:ring-2 focus:ring-[#C9EB55]/60"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              <span>I agree to be contacted directly if priority handling requires follow-up through a support channel.</span>
            </label>

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-2 w-full">
                <button
                  type="submit"
                  className="inline-flex items-center px-6 py-3 rounded-xl bg-[#C9EB55]/15 border border-[#C9EB55]/40 text-[#C9EB55] font-semibold text-sm uppercase tracking-wide hover:bg-[#C9EB55]/25 transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !isFormValid}
                >
                  {isSubmitting ? "Sending..." : "Submit Priority Request"}
                  <span className="ml-2">→</span>
                </button>
                {status.type && (
                  <p className={`text-xs ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {status.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
