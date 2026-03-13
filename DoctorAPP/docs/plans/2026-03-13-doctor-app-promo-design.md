# Doctor App 30s Investor Promo (Remotion) — Design

Date: 2026-03-13
Owner: Codex + User
Status: Approved

## 1) Goal & Audience
Create a 30-second, investor-targeted promotional video for the Doctor App (Diagnostic clinician dashboard). The tone is bold and visionary while staying clinically credible. The video must feel premium, show proof of the product, and land a clear CTA.

## 2) Success Criteria
- Feels premium and credible in under 30 seconds.
- Balances vision (problem + pipeline) with concrete proof (UI screenshots).
- Clear, memorable CTA for pilot partners.

## 3) Story & Timing (30s at 30fps = 900 frames)
0–3s: Problem statement headline (e.g., “Subjective pain. Objective evidence.”)
3–8s: Narrative → data transformation motif.
8–14s: RAG pipeline visual (PubMedBERT + vector search → Clinical Brief).
14–22s: UI proof: 2 dashboard screenshots with animated callouts (deltas, risk bars, guiding questions).
22–27s: Impact line (“Faster, fairer diagnoses.”).
27–30s: Product name + CTA (“Pilot partners”).

## 4) Visual System
- Background: deep ink/teal gradient.
- Foreground: liquid-glass cards with subtle glow.
- Accent: warm amber for urgency.
- Typography: bold geometric sans (Sora or Space Grotesk).
- Motion: confident, clean, premium (no gimmicks).

## 5) Remotion Architecture
Single composition: `DoctorAppPromo30` (1920x1080, 30fps, 900 frames).
Scenes as `Sequence`s:
- Intro
- Pipeline
- Evidence
- DashShotA
- DashShotB
- Impact
- CTA

Data flow:
- Static script object for copy, colors, and timings passed as props.
- All animations via `useCurrentFrame()` + `interpolate()` (no CSS animations).

## 6) Assets & UI Usage
Use 2 best screenshots from:
- /Users/user/Desktop/MyHealthPal/Dashphotos

Treatment:
- Crop to 16:9 safe frame, slight zoom/parallax.
- Animated callout boxes and highlights for key elements.
- If a screenshot is too dense or low-contrast, replace with the next best.

## 7) Audio & Delivery
- Optional ambient tech bed, subtle risers at transitions.
- No voiceover by default.
- Output: 1080p H.264 MP4.

## 8) Testing & Risks
- Verify text legibility at 1080p.
- Check text overflow and safe margins.
- Review pacing at scene cuts.
- Render a draft mp4 and inspect cut points.

