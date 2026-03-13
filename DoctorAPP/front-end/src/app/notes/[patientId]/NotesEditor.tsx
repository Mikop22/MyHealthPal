"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getPatientNotes, savePatientNote, updatePatientNote } from "@/lib/api";

interface NotesEditorProps {
  patientId: string;
}

export function NotesEditor({ patientId }: NotesEditorProps) {
  const [notes, setNotes] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef(notes);
  const noteIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  // Keep noteIdRef in sync with state
  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  // Track mounted state for cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Load existing notes on mount
  useEffect(() => {
    let cancelled = false;
    getPatientNotes(patientId)
      .then((existing) => {
        if (cancelled) return;
        if (existing.length > 0) {
          setNotes(existing[0].content);
          setNoteId(existing[0].id);
          noteIdRef.current = existing[0].id;
          latestContent.current = existing[0].content;
        }
      })
      .catch(() => {
        /* backend unavailable — start with empty editor */
      });
    return () => { cancelled = true; };
  }, [patientId]);

  const persist = useCallback(
    async (content: string) => {
      if (savingRef.current) return;
      savingRef.current = true;
      if (mountedRef.current) setSaveStatus("saving");
      try {
        if (noteIdRef.current) {
          await updatePatientNote(patientId, noteIdRef.current, content);
        } else {
          const created = await savePatientNote(patientId, content);
          noteIdRef.current = created.id;
          if (mountedRef.current) setNoteId(created.id);
        }
        if (mountedRef.current) setSaveStatus("saved");
      } catch {
        if (mountedRef.current) setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    },
    [patientId],
  );

  const handleChange = (value: string) => {
    setNotes(value);
    latestContent.current = value;
    setSaveStatus("idle");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      persist(latestContent.current);
    }, 1000);
  };

  const statusLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "";

  return (
    <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
      {statusLabel && (
        <div className="flex justify-end px-6 pt-3">
          <span
            className={`text-[12px] font-medium ${
              saveStatus === "error"
                ? "text-red-500"
                : "text-[var(--text-muted)]"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type your notes here..."
        className="w-full flex-1 resize-none bg-transparent px-10 py-8 text-[15px] font-medium leading-[48px] tracking-[-0.1px] text-[var(--text-body)] placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:outline-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 47px, rgba(232,222,248,0.4) 47px, rgba(232,222,248,0.4) 48px)",
          backgroundSize: "100% 48px",
          backgroundPositionY: "32px",
        }}
        spellCheck
      />
    </div>
  );
}
