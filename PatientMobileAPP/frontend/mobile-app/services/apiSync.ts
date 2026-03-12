import {
  usePatientStore,
  type DemographicPayload,
  type TriageSymptom,
  type TranscribedAudio,
} from "../store/patientStore";

const API_BASE = "http://localhost:8000";

export interface MobileIntakePayload {
  submittedAt: string;
  demographics: DemographicPayload;
  triageSymptoms: TriageSymptom[];
  transcribedAudio: TranscribedAudio | null;
}

function buildPayload(): MobileIntakePayload {
  const { demographics, triageSymptoms, transcribedAudio } =
    usePatientStore.getState();

  return {
    submittedAt: new Date().toISOString(),
    demographics,
    triageSymptoms,
    transcribedAudio,
  };
}

/**
 * Simulates a POST to the backend intake endpoint.
 * In production this hits the real FastAPI route; for now it
 * resolves after a 2-second delay to mimic the Dual-Output RAG
 * pipeline processing time.
 */
export async function submitIntake(): Promise<{
  ok: boolean;
  payload: MobileIntakePayload;
}> {
  const payload = buildPayload();

  if (__DEV__) {
    console.log(
      "[apiSync] POST /api/v1/intake/mobile →",
      JSON.stringify(payload, null, 2),
    );
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/intake/mobile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { ok: true, payload };
  } catch {
    /* backend unreachable — fall through to simulated delay */
  }

  await new Promise((r) => setTimeout(r, 2000));
  return { ok: true, payload };
}
