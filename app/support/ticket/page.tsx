"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TicketPage() {
  const [isClient, setIsClient] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      const trimmedSubject = subject.trim();
      const trimmedDescription = description.trim();
      const payloadDescription = trimmedName
        ? `Submitted by: ${trimmedName}\n\n${trimmedDescription}`
        : trimmedDescription;
      const screenshotUrl = await uploadFirstAttachment();

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedSubject,
          email: email.trim(),
          priority: "Starter",
          description: payloadDescription,
          screenshotUrl,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit ticket");
      }

      setStatus({ type: "success", message: "Ticket submitted successfully! We\'ll respond within 24-48 hours." });
      setFullName("");
      setEmail("");
      setSubject("");
      setDescription("");
      setAttachments([]);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to submit ticket. Please try again.",
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
            {[...Array(200)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-[2px] w-[2px] rounded-full bg-[#C9EB55]/40"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: Math.random() * 8 + 5,
                  repeat: Infinity,
                  delay: Math.random() * 8,
                  ease: "easeInOut",
                }}
              />
            ))}

            {[...Array(150)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute h-[1px] w-[1px] rounded-full bg-white"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 5,
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
      `}</style>

      <main className="relative z-10 max-w-3xl mx-auto px-6 md:px-10 pt-5 pb-10 md:pt-6 md:pb-14 space-y-10">
        <section className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold neon-headline text-[#C9EB55]"
          >
            Submit a Ticket
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-white/70"
          >
            Describe your issue and we&apos;ll get back to you within 24-48 hours.
          </motion.p>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-panel rounded-2xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-white/80">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 input-shell rounded-lg text-white focus:outline-none focus:border-[#C9EB55]/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 input-shell rounded-lg text-white focus:outline-none focus:border-[#C9EB55]/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="block text-sm font-medium text-white/80">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-4 py-3 input-shell rounded-lg text-white focus:outline-none focus:border-[#C9EB55]/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-white/80">
                Description
              </label>
              <div className="rounded-2xl input-shell p-3 space-y-3">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-transparent rounded-xl text-white focus:outline-none resize-none"
                  placeholder="Describe your issue in detail..."
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

            {status.type && (
              <div
                className={`px-4 py-3 rounded-lg ${
                  status.type === "success"
                    ? "bg-[#C9EB55]/10 border border-[#C9EB55]/30 text-[#C9EB55]"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-[#C9EB55] text-black rounded-full font-semibold hover:shadow-[0_0_24px_rgba(201,235,85,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
              <Link
                href="/support"
                className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-full font-semibold hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
              >
                Back
              </Link>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
