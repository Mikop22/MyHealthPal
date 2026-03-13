"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPaperUrl } from "@/lib/api";
import type { ConditionMatch } from "@/lib/types";

// Global blob cache — persists across accordion open/close cycles
const blobCache = new Map<string, string>();
const fetchPromises = new Map<string, Promise<string | null>>();

function fetchAndCache(pmcid: string): Promise<string | null> {
  if (blobCache.has(pmcid)) return Promise.resolve(blobCache.get(pmcid)!);
  if (fetchPromises.has(pmcid)) return fetchPromises.get(pmcid)!;

  const promise = fetch(getPaperUrl(pmcid), {
    headers: { "ngrok-skip-browser-warning": "true" },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(pmcid, blobUrl);
      fetchPromises.delete(pmcid);
      return blobUrl;
    })
    .catch(() => {
      fetchPromises.delete(pmcid);
      return null;
    });

  fetchPromises.set(pmcid, promise);
  return promise;
}

function usePdfBlob(pmcid: string | null) {
  const [url, setUrl] = useState<string | null>(
    pmcid ? (blobCache.get(pmcid) ?? null) : null
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pmcid) return;
    if (blobCache.has(pmcid)) return;
    fetchAndCache(pmcid).then((blobUrl) => {
      if (blobUrl) setUrl(blobUrl);
      else setError(true);
    });
  }, [pmcid]);

  return { url, error };
}

/** Prefetch all PDFs in background so they're cached when user clicks */
function usePrefetchPdfs(pmcids: string[]) {
  useEffect(() => {
    pmcids.forEach((id) => fetchAndCache(id));
  }, [pmcids]);
}

function PdfViewer({ pmcid, title }: { pmcid: string | null; title: string }) {
  const { url, error } = usePdfBlob(pmcid);

  if (!pmcid) return null;

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 px-6"
        style={{ background: "var(--lavender-bg)", borderTop: "1px solid rgba(255,255,255,0.15)" }}
      >
        <svg
          className="mb-3 h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: "var(--lavender-border)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="mb-1.5 text-[13px] font-medium text-[var(--text-muted)]">PDF not available</p>
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${pmcid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[var(--purple-primary)] underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          View on PubMed →
        </a>
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className="flex items-center justify-center py-8"
        style={{ background: "var(--lavender-bg)", borderTop: "1px solid rgba(255,255,255,0.15)" }}
      >
        <div
          className="h-7 w-7 animate-spin rounded-full border-2 border-t-[var(--purple-primary)]"
          style={{ borderColor: "var(--lavender-border)", borderTopColor: "var(--purple-primary)" }}
        />
      </div>
    );
  }

  return (
    <div className="h-[520px]" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
      <iframe src={url} className="h-full w-full border-0" title={`Paper: ${title}`} />
    </div>
  );
}

interface AccordionProps {
  matches: ConditionMatch[];
  showPdf?: boolean;
}

export function DiagnosticNudgeAccordion({ matches, showPdf = false }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Only prefetch PDFs when the viewer will actually be shown (notes page)
  usePrefetchPdfs(showPdf ? matches.map((m) => m.pmcid) : []);

  return (
    <div className="flex flex-col gap-2">
      {matches.map((match, i) => {
        const isOpen = openIndex === i;
        const scorePercent = (match.similarity_score * 100).toFixed(1);
        const isTopMatch = i === 0;

        return (
          <motion.div
            key={match.pmcid}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-[14px]"
            style={{
              border: isOpen
                ? "1px solid rgba(68,173,79,0.22)"
                : "1px solid rgba(255,255,255,0.20)",
              background: isOpen
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.07)",
              backdropFilter: "blur(16px)",
              boxShadow: isOpen
                ? "0 4px 16px rgba(68,173,79,0.10)"
                : "0 2px 8px rgba(68,173,79,0.04)",
              transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
            }}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-opacity hover:opacity-80"
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{
                    background: isTopMatch
                      ? "linear-gradient(135deg, rgba(68,173,79,0.18), rgba(124,201,94,0.18))"
                      : "var(--lavender-bg)",
                    color: isTopMatch ? "var(--purple-primary)" : "var(--text-muted)",
                    border: isTopMatch ? "1px solid rgba(68,173,79,0.20)" : "1px solid var(--lavender-border)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[13px] font-semibold leading-snug tracking-[-0.1px]"
                    style={{ color: isTopMatch ? "var(--text-primary)" : "var(--text-body)" }}
                  >
                    {match.condition}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                    PMCID: {match.pmcid} · {match.title}
                  </p>
                </div>
              </div >
              <div className="ml-3 flex shrink-0 items-center gap-2.5">
                <span
                  className="rounded-[8px] px-2 py-0.5 font-mono text-[11px] font-semibold"
                  style={{
                    background: isTopMatch ? "rgba(68,173,79,0.10)" : "var(--lavender-bg)",
                    color: isTopMatch ? "var(--purple-primary)" : "var(--text-muted)",
                  }}
                >
                  {scorePercent}%
                </span>
                <motion.svg
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: "var(--text-nav)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div >
            </button >

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {/* Abstract snippet */}
                  <div
                    className="px-4 py-3"
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-[12px] leading-[1.6] text-[var(--text-body)]">{match.snippet}</p>
                  </div>
                  {/* Inline PDF viewer — only rendered in the notes section */}
                  {showPdf && <PdfViewer pmcid={isOpen ? match.pmcid : null} title={match.title} />}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div >
        );
      })}
    </div >
  );
}
