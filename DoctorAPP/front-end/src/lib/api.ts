import type { PatientPayload, AnalysisResponse, PatientRecord, AppointmentRecord, ClinicalNote } from "./types";

// In production, requests to /api/v1/* are proxied through Next.js rewrites
// to the backend, avoiding mixed-content (HTTPS→HTTP) browser blocks.
const API_BASE = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const COMMON_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
};

export async function getDashboardData(patientId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/patients/${patientId}/dashboard`, {
    cache: "no-store",
    headers: COMMON_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function getPaperUrl(pmcid: string): string {
  return `${API_BASE}/api/v1/paper/${pmcid}`;
}

// --- Patient Management ---

export async function fetchPatients(): Promise<PatientRecord[]> {
  const res = await fetch(`${API_BASE}/api/v1/patients`, {
    cache: "no-store",
    headers: COMMON_HEADERS,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function createPatient(name: string, email: string): Promise<PatientRecord> {
  const res = await fetch(`${API_BASE}/api/v1/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create patient: ${body}`);
  }
  return res.json();
}

export async function createTestPatient(patientNarrative?: string): Promise<PatientRecord> {
  const res = await fetch(`${API_BASE}/api/v1/patients/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
    body: JSON.stringify({ patient_narrative: patientNarrative }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create test patient: ${body}`);
  }
  return res.json();
}

export async function submitTestPatientAnalysis(patientId: string): Promise<{ status: string; message: string; primary_concern: string }> {
  const res = await fetch(`${API_BASE}/api/v1/patients/test/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to submit test patient analysis: ${body}`);
  }
  return res.json();
}

export async function getIntakeStatus(
  token: string
): Promise<{ biometrics_received: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/intake/${encodeURIComponent(token)}/status`, {
    cache: "no-store",
    headers: COMMON_HEADERS,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function createAppointment(
  patientId: string,
  date: string,
  time: string
): Promise<AppointmentRecord> {
  const res = await fetch(`${API_BASE}/api/v1/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
    body: JSON.stringify({ patient_id: patientId, date, time }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create appointment: ${body}`);
  }
  return res.json();
}

// --- Schedule ---

export async function fetchAppointmentsByDate(date: string): Promise<AppointmentRecord[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/appointments?date=${encodeURIComponent(date)}`,
    { cache: "no-store", headers: COMMON_HEADERS }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// --- Clinical Notes ---

export async function getPatientNotes(patientId: string): Promise<ClinicalNote[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/patients/${patientId}/notes`,
    { cache: "no-store", headers: COMMON_HEADERS }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function savePatientNote(
  patientId: string,
  content: string,
  appointmentId?: string
): Promise<ClinicalNote> {
  const res = await fetch(`${API_BASE}/api/v1/patients/${patientId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
    body: JSON.stringify({ content, appointment_id: appointmentId }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function updatePatientNote(
  patientId: string,
  noteId: string,
  content: string
): Promise<ClinicalNote> {
  const res = await fetch(`${API_BASE}/api/v1/patients/${patientId}/notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function deletePatientNote(
  patientId: string,
  noteId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/patients/${patientId}/notes/${noteId}`, {
    method: "DELETE",
    headers: COMMON_HEADERS,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

