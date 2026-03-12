/**
 * API client for the MyHealthPal mobile app.
 *
 * Talks to the FastAPI backend (POST /translate, etc.).
 * Handles both native file URIs and web data-URLs when
 * building the multipart FormData for image uploads.
 */

import { Platform } from "react-native";

// Use EXPO_PUBLIC_API_URL when running on device/simulator (e.g. http://192.168.1.x:8000).
// On web, localhost:8000 works if the backend runs on the same machine.
const API_BASE =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
    "http://localhost:8000";

/* ── Types ── */

export interface TranslateResult {
    summaryBullets: string[];
    nutritionalSwap: string;
}

/* ── /translate ── */

/**
 * Send a captured image to GET /translate for MedGemma analysis.
 *
 * @param imageUri - file URI (native) or data-URL (web) from the camera
 * @param culture  - optional cultural context
 * @param diet     - optional dietary info
 * @param biometrics - optional biometric context
 */
export async function postTranslate(
    imageUri: string,
    culture?: string,
    diet?: string,
    biometrics?: string,
): Promise<TranslateResult> {
    const formData = new FormData();

    if (Platform.OS === "web") {
        // Web camera gives us a data:image/jpeg;base64,... URL
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append("image", blob, "scan.jpg");
    } else {
        // Native camera gives us a file:/// URI — React Native's FormData
        // accepts { uri, type, name } as a blob-like object.
        formData.append("image", {
            uri: imageUri,
            type: "image/jpeg",
            name: "scan.jpg",
        } as unknown as Blob);
    }

    if (culture?.trim()) formData.append("culture", culture.trim());
    if (diet?.trim()) formData.append("diet", diet.trim());
    if (biometrics?.trim()) formData.append("biometrics", biometrics.trim());

    let response: Response;
    try {
        response = await fetch(`${API_BASE}/translate`, {
            method: "POST",
            body: formData,
        });
    } catch (e) {
        const msg =
            e instanceof TypeError && e.message?.toLowerCase().includes("fetch")
                ? `Cannot reach the backend at ${API_BASE}. Is it running? (uvicorn from backend/ with venv activated)`
                : (e instanceof Error ? e.message : "Network error");
        throw new Error(msg);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || data.detail || `Server error (${response.status})`,
        );
    }

    return data as TranslateResult;
}

/* ── Types: Triage ── */

export interface TriageSymptomCard {
    id: string;
    label: string;
    explanation: string;
    severity: 1 | 2 | 3 | 4 | 5;
}

export interface TriageExtractResult {
    symptoms: TriageSymptomCard[];
}

/* ── /triage/extract ── */

/**
 * Send free-text symptom description to MedGemma for triage card extraction.
 */
export async function postTriageExtract(
    text: string,
): Promise<TriageExtractResult> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE}/triage/extract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
    } catch (e) {
        const msg =
            e instanceof TypeError && e.message?.toLowerCase().includes("fetch")
                ? `Cannot reach the backend at ${API_BASE}. Is it running?`
                : (e instanceof Error ? e.message : "Network error");
        throw new Error(msg);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.detail || data.error || `Server error (${response.status})`,
        );
    }

    return data as TriageExtractResult;
}
