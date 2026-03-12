"use client";

import { useState } from "react";

export function NotesEditor() {
  const [notes, setNotes] = useState("");

  return (
    <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
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
