"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AddPatientModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function AddPatientModal({ open, onClose, onCreated }: AddPatientModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { createPatient } = await import("@/lib/api");
            await createPatient(name.trim(), email.trim());
            setName("");
            setEmail("");
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create patient");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop — frosted tinted overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-[rgba(47,28,78,0.18)] backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal — liquid glass surface */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.88, y: 24, filter: "blur(12px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(8px)" }}
                        transition={{
                            type: "spring",
                            damping: 28,
                            stiffness: 320,
                            mass: 0.8,
                        }}
                        className="relative w-full max-w-md rounded-[28px] p-8 overflow-hidden"
                        style={{
                            fontFamily: "var(--font-lato), 'Lato', sans-serif",
                            background:
                                "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 55%), rgba(255,255,255,0.72)",
                            backdropFilter: "blur(28px) saturate(1.6)",
                            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
                            border: "1px solid rgba(255,255,255,0.55)",
                            boxShadow:
                                "0 8px 40px rgba(68,173,79,0.12), 0 2px 12px rgba(68,173,79,0.06), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(200,230,210,0.2)",
                        }}
                    >
                        {/* Specular highlight overlay */}
                        <div
                            className="pointer-events-none absolute inset-0 rounded-[28px]"
                            style={{
                                background:
                                    "radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.35) 0%, transparent 50%)",
                            }}
                        />

                        <button
                            onClick={onClose}
                            className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/40 text-[var(--text-muted)] backdrop-blur-sm transition-all hover:bg-white/60 hover:text-[var(--text-primary)] hover:scale-110 active:scale-95"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="relative z-10">
                            <h2 className="text-[22px] font-medium tracking-[-0.3px] text-[var(--text-primary)] mb-1">
                                New Patient
                            </h2>
                            <p className="text-[13px] text-[var(--text-muted)] mb-8">
                                Create a patient record with an XRP wallet
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-medium tracking-[0.5px] text-[var(--text-muted)]">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Jordan Lee"
                                        className="h-11 rounded-[14px] border border-white/40 bg-white/30 px-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none backdrop-blur-sm transition-all focus:border-[var(--purple-primary)] focus:bg-white/50 focus:shadow-[0_0_0_3px_rgba(68,173,79,0.08)]"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-medium tracking-[0.5px] text-[var(--text-muted)]">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="e.g. patient@email.com"
                                        className="h-11 rounded-[14px] border border-white/40 bg-white/30 px-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none backdrop-blur-sm transition-all focus:border-[var(--purple-primary)] focus:bg-white/50 focus:shadow-[0_0_0_3px_rgba(68,173,79,0.08)]"
                                    />
                                </div>

                                {error && (
                                    <p className="text-[13px] text-red-500 rounded-[10px] px-3 py-2"
                                        style={{
                                            background: "rgba(255,200,200,0.25)",
                                            backdropFilter: "blur(8px)",
                                            border: "1px solid rgba(255,150,150,0.3)",
                                        }}
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !name.trim() || !email.trim()}
                                    className="glass-purple flex h-12 items-center justify-center gap-2 rounded-[22px] transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    <span className="text-[14px] font-medium tracking-[-0.1px] text-white">
                                        {loading ? "Creating wallet..." : "Create Patient"}
                                    </span>
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
