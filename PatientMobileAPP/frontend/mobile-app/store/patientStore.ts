import { create } from "zustand";

/* ───────────── Type Definitions ───────────── */

export type BiologicalSex = "female" | "male" | "intersex" | "prefer_not_to_say";

export interface DemographicPayload {
  age: number | null;
  sex: BiologicalSex | null;
  primaryLanguage: string | null;
  ethnicity: string[];
  completedAt: string | null;
}

export interface TriageSymptom {
  id: string;
  label: string;
  confirmed: boolean;
  severity: 1 | 2 | 3 | 4 | 5;
  swipedAt: string;
}

export interface TranscribedAudio {
  rawText: string;
  durationMs: number;
  recordedAt: string;
  languageCode: string;
}

export interface PatientState {
  /* ── Slices ── */
  demographics: DemographicPayload;
  triageSymptoms: TriageSymptom[];
  transcribedAudio: TranscribedAudio | null;

  /* ── Actions: Demographics ── */
  setAge: (age: number) => void;
  setSex: (sex: BiologicalSex) => void;
  setLanguage: (lang: string) => void;
  setEthnicity: (ethnicities: string[]) => void;
  completeDemographics: () => void;

  /* ── Actions: Triage ── */
  addSymptom: (symptom: Omit<TriageSymptom, "swipedAt">) => void;
  confirmSymptom: (id: string, confirmed: boolean) => void;
  clearSymptoms: () => void;

  /* ── Actions: Audio ── */
  setTranscription: (audio: TranscribedAudio) => void;
  clearTranscription: () => void;

  /* ── Global ── */
  resetAll: () => void;
}

/* ───────────── Initial State ───────────── */

const INITIAL_DEMOGRAPHICS: DemographicPayload = {
  age: null,
  sex: null,
  primaryLanguage: null,
  ethnicity: [],
  completedAt: null,
};

/* ───────────── Store ───────────── */

export const usePatientStore = create<PatientState>()((set) => ({
  demographics: { ...INITIAL_DEMOGRAPHICS },
  triageSymptoms: [],
  transcribedAudio: null,

  /* Demographics */
  setAge: (age) =>
    set((s) => ({ demographics: { ...s.demographics, age } })),

  setSex: (sex) =>
    set((s) => ({ demographics: { ...s.demographics, sex } })),

  setLanguage: (lang) =>
    set((s) => ({
      demographics: { ...s.demographics, primaryLanguage: lang },
    })),

  setEthnicity: (ethnicities) =>
    set((s) => ({
      demographics: { ...s.demographics, ethnicity: ethnicities },
    })),

  completeDemographics: () =>
    set((s) => ({
      demographics: {
        ...s.demographics,
        completedAt: new Date().toISOString(),
      },
    })),

  /* Triage */
  addSymptom: (symptom) =>
    set((s) => ({
      triageSymptoms: [
        ...s.triageSymptoms,
        { ...symptom, swipedAt: new Date().toISOString() },
      ],
    })),

  confirmSymptom: (id, confirmed) =>
    set((s) => ({
      triageSymptoms: s.triageSymptoms.map((sym) =>
        sym.id === id ? { ...sym, confirmed } : sym,
      ),
    })),

  clearSymptoms: () => set({ triageSymptoms: [] }),

  /* Audio */
  setTranscription: (audio) => set({ transcribedAudio: audio }),
  clearTranscription: () => set({ transcribedAudio: null }),

  /* Reset */
  resetAll: () =>
    set({
      demographics: { ...INITIAL_DEMOGRAPHICS },
      triageSymptoms: [],
      transcribedAudio: null,
    }),
}));
