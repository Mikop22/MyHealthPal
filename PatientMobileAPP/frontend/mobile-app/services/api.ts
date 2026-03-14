/**
 * API client for the MyHealthPal mobile app.
 *
 * Talks to the FastAPI backend (POST /translate, etc.).
 * Handles both native file URIs and web data-URLs when
 * building the multipart FormData for image uploads.
 */

import { Platform } from "react-native";

// Use EXPO_PUBLIC_API_URL when running on device/simulator (e.g. http://192.168.1.x:8080).
// On web, localhost:8080 works if the backend runs on the same machine.
const API_BASE =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
    "http://localhost:8080";

/* ── Types ── */

export interface TranslateResult {
    summaryBullets: string[];
    nutritionalSwap: string;
    followUpQuestions: string[];
}

export interface TranslateFollowUpResult {
    answer: string;
}

/* ── /translate ── */

async function appendImageToFormData(formData: FormData, imageUri: string) {
    if (Platform.OS === "web") {
        // Web camera gives us a data:image/jpeg;base64,... URL
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append("image", blob, "scan.jpg");
        return;
    }

    // Native camera gives us a file:/// URI — React Native's FormData
    // accepts { uri, type, name } as a blob-like object.
    formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: "scan.jpg",
    } as unknown as Blob);
}

/**
 * Send a captured image to POST /translate for MedGemma analysis.
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
    await appendImageToFormData(formData, imageUri);

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

export async function postTranslateFollowUp(
    imageUri: string,
    question: string,
): Promise<TranslateFollowUpResult> {
    const formData = new FormData();
    await appendImageToFormData(formData, imageUri);
    formData.append("question", question.trim());

    let response: Response;
    try {
        response = await fetch(`${API_BASE}/translate/follow-up`, {
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

    return data as TranslateFollowUpResult;
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

/* ── Types: Campaigns / Crowdfunding ── */

export interface CampaignCreate {
    owner_identifier: string;
    title: string;
    description: string;
    goal_amount: number;
    deadline?: string;
    category?: string;
    about_me?: string;
}

export interface CampaignResponse {
    id: string;
    owner_identifier: string;
    title: string;
    description: string;
    goal_amount: number;
    status: string;
    deadline?: string;
    category?: string;
    about_me?: string;
    created_at: string;
}

export interface CampaignDetailResponse extends CampaignResponse {
    total_raised: number;
}

export interface ContributionCreate {
    contributor_identifier: string;
    amount: number;
    message?: string;
}

export interface ContributionResponse {
    id: string;
    campaign_id: string;
    contributor_identifier: string;
    amount: number;
    message?: string;
    created_at: string;
}

/* ── /campaigns ── */

export async function createCampaign(data: CampaignCreate): Promise<CampaignResponse> {
    const response = await fetch(`${API_BASE}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as CampaignResponse;
}

export async function listCampaigns(): Promise<CampaignDetailResponse[]> {
    const response = await fetch(`${API_BASE}/campaigns`);
    const body = await response.json().catch(() => []);
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as CampaignDetailResponse[];
}

export async function getCampaign(campaignId: string): Promise<CampaignDetailResponse> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as CampaignDetailResponse;
}

export async function createContribution(
    campaignId: string,
    data: ContributionCreate,
): Promise<ContributionResponse> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as ContributionResponse;
}

export async function listContributions(campaignId: string): Promise<ContributionResponse[]> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}/contributions`);
    const body = await response.json().catch(() => []);
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as ContributionResponse[];
}

/* ── Types: Action Plan ── */

export interface ActionPlanResponse {
    summary_bullets: string[];
    questions: string[];
}

/* ── /check-in/action-plan ── */

export async function postActionPlan(data: {
    transcript: string;
    confirmed_card_ids: string[];
    rejected_card_ids: string[];
    confirmed_symptom_labels?: Record<string, string>;
    rejected_symptom_labels?: Record<string, string>;
}): Promise<ActionPlanResponse> {
    const payload = {
        transcript: data.transcript,
        confirmed_card_ids: data.confirmed_card_ids,
        rejected_card_ids: data.rejected_card_ids,
        ...(data.confirmed_symptom_labels && { confirmed_symptom_labels: data.confirmed_symptom_labels }),
        ...(data.rejected_symptom_labels && { rejected_symptom_labels: data.rejected_symptom_labels }),
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000);
    const response = await fetch(`${API_BASE}/check-in/action-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as ActionPlanResponse;
}

/* ── /labels ── */

export async function postLabel(data: {
    flow: string;
    raw_input?: Record<string, unknown>;
    model_output: Record<string, unknown>;
    user_corrected?: Record<string, unknown>;
    truth_diagnosis?: string;
    notes?: string;
}): Promise<{ id: string; flow: string }> {
    const response = await fetch(`${API_BASE}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as { id: string; flow: string };
}

/* ── Types: Profile ── */

export interface ProfilePayload {
    age: number | null;
    sex: string | null;
    primary_language: string | null;
    ethnicity: string[];
}

/* ── /profile ── */

export async function getProfile(patientId: string): Promise<ProfilePayload> {
    const response = await fetch(`${API_BASE}/profile/${patientId}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as ProfilePayload;
}

export async function updateProfile(
    patientId: string,
    data: ProfilePayload,
): Promise<ProfilePayload> {
    const response = await fetch(`${API_BASE}/profile/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Server error (${response.status})`);
    return body as ProfilePayload;
}
