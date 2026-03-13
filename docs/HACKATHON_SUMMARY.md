# MyHealthPal Hackathon Summary

## The Problem We Are Solving and Why It Matters

Many patients—especially people from historically underserved communities—struggle to have their symptoms taken seriously during short medical appointments. The most important context is often spread across free-text symptom descriptions, scanned medical documents, and wearable-device data that clinicians do not have time to manually review. That creates a real-world gap between what the patient is experiencing and what the provider can see in the moment.

This matters because missed context leads to missed warning signs, incomplete conversations, and patients feeling dismissed even when they are accurately describing serious symptoms. In women’s health and other areas where symptoms are often minimized or labeled as “normal,” that gap can delay diagnosis, reduce trust, and worsen outcomes. MyHealthPal is designed to reduce that gap by turning raw patient input into structured, reviewable evidence that supports better advocacy and better clinical decision-making.

## Solution

MyHealthPal is a patient-to-clinician advocacy platform that turns subjective health experiences into organized, reviewable clinical evidence. The system combines two connected experiences:

- **PatientMobileAPP** gives patients a guided way to prepare before an appointment by sharing symptom narratives, documents, and optional health data.
- **DoctorAPP** gives clinicians a dashboard that summarizes the patient story, highlights key biometric changes, and surfaces literature-backed insights to support better conversations and follow-up decisions.

At the platform level, MyHealthPal uses AI, structured intake flows, and wearable data to transform raw patient input into a format that is easier for care teams to understand quickly. Instead of replacing the clinician, the product is designed to improve the quality of the interaction by making the patient’s experience more visible, more measurable, and harder to overlook.

## Prototype / Demo Walkthrough

The prototype demonstrates an end-to-end patient preparation and clinician review workflow:

1. **The clinician starts in DoctorAPP** by creating a patient record and scheduling an appointment.
2. **DoctorAPP generates a prep episode and invite flow** so the patient can complete pre-visit intake on mobile instead of filling out a rushed form at the appointment.
3. **The patient uses PatientMobileAPP** to complete onboarding, describe symptoms in natural language, upload or scan medical documents, and optionally include wearable or health data.
4. **The backend processes the prep package** by organizing the narrative, extracting symptom context, generating a patient-safe summary, and preparing a richer clinician-facing analysis.
5. **The clinician opens the DoctorAPP dashboard** to review key symptoms, notable biometric deltas, guiding questions, risk factors, and possible literature-backed explanations before or during the appointment.
6. **The patient sees a simpler output** focused on neutral summary bullets and helpful questions to ask, while the clinician sees the deeper analytical dashboard.

This walkthrough is important because it shows that the prototype is not just a standalone AI demo. It is a connected workflow that links patient intake, AI-assisted processing, and clinician review in one system. The result is a clearer conversation in the exam room, where both sides are better prepared.

## How AI Is Being Used

AI is being used as a decision-support and translation layer, not as a replacement for clinical judgment.

- **Narrative understanding:** The platform takes the patient’s free-text symptom story and helps structure it into clinically useful information.
- **Document translation and summarization:** Uploaded records or images can be processed into easier-to-review summaries so patients and clinicians can quickly understand what matters.
- **Biometric interpretation:** Recent wearable data is compared with the patient’s own baseline to identify meaningful changes rather than relying only on population averages.
- **Retrieval-augmented analysis:** The DoctorAPP backend uses embeddings, hybrid search, and LLM-based structured extraction to connect the patient narrative and biometric changes with relevant medical literature.
- **Patient-safe communication:** AI-generated output is filtered into a simpler summary for patients, while clinicians receive a more detailed dashboard with richer context and cited evidence.

This is a key part of the project’s value: AI helps transform messy, fragmented health information into organized insights that are easier to act on, while still keeping the clinician in control of the final interpretation.

## Technology Stack / Tools Used

MyHealthPal is built as a connected, full-stack prototype across mobile, web, and backend services:

- **PatientMobileAPP mobile client:** Expo, React Native, Expo Router, NativeWind, Zustand, and supporting Expo libraries for camera, image upload, and mobile experience.
- **DoctorAPP web client:** Next.js, TypeScript, Tailwind CSS, SWR, Framer Motion, and Recharts for the clinician dashboard experience.
- **Backend services:** FastAPI and Pydantic power the APIs and typed data contracts used by both applications.
- **AI and data tooling:** OpenAI-compatible LLM integrations, LangChain orchestration, biomedical embeddings, MongoDB-based hybrid/vector search, and MedGemma-powered document/image summarization support the intelligence layer.
- **Additional integrations:** wearable and biometric data ingestion, email-based invite flows, and blockchain-related components for broader patient-support use cases in the prototype.

This stack was chosen to make the prototype fast to build, easy to demo, and flexible enough to connect patient experiences with clinician workflows in real time.

## Community Impact and Future Scalability

MyHealthPal aims to create impact in three important ways:

1. **Better patient advocacy:** Patients arrive with a clearer, more structured summary of what they are experiencing and the questions they should ask during the appointment.
2. **Better clinical visibility:** Clinicians can review relevant context, symptom patterns, and health signals in one place instead of piecing them together manually.
3. **More equitable care:** By reducing the chances that pain, symptoms, or lived experience are dismissed, the platform supports a more consistent and evidence-informed care experience for underserved patients.

From a community perspective, the solution matters because it is built around a real trust problem in healthcare: many people do not feel heard, and many clinicians do not have enough time or structured information to fully understand the patient’s experience. A tool that helps both sides communicate more clearly can improve confidence, reduce friction, and create a more equitable care experience.

The project is also designed with future scalability in mind. Because the architecture already separates the patient-facing mobile experience from the clinician-facing workspace, it can grow into a broader platform without rewriting the entire system. The same model could scale to:

- more conditions and specialties beyond the current demo focus,
- more wearable integrations and health-data sources,
- multilingual and culturally aware patient-support flows,
- larger clinical teams and appointment volumes,
- deeper literature retrieval and care-planning support,
- and stronger production-grade security, analytics, and interoperability layers.

For a hackathon setting, MyHealthPal demonstrates more than a concept. It shows a practical prototype for how AI-assisted intake, patient advocacy, clinician workflows, and structured health data can work together in one end-to-end system to improve communication, trust, and decision-making across the patient journey.
