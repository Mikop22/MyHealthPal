# Backend RAG Upgrade — New Metrics, Appointment Dashboard, Webhook Hardening

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the biometric data model with 4 high-signal metrics, wire up a lightweight appointment dashboard endpoint, and harden the seed data with condition-specific realistic values.

**Architecture:** All changes are purely additive to existing Pydantic models with `= []` defaults (backward-compatible with existing DB documents). New metrics flow through the existing pipeline: model → analyze thresholds → seed → mock fallback data. A new `GET /api/v1/appointments/{id}/dashboard` endpoint reads pre-computed analysis without touching LLM/vector search.

**Tech Stack:** FastAPI, Pydantic v2, PyMongo, Python 3.12.

---

## What Already Exists (do NOT re-implement)

- `POST /api/v1/intake/{token}/submit` — fully built in `routes/intake.py`
- `POST /api/v1/webhook/apple-health/{token}` — fully built in `routes/webhook.py`
- `GET /api/v1/intake/{token}/status` — fully built in `routes/webhook.py`
- `GET /api/v1/patients/{patient_id}/dashboard` — fully built in `routes/patients.py`

---

## Task 1: Expand Pydantic Schema — 4 New Metrics

**Files:**
- Modify: `back-end/app/models/patient.py`

**Context:** `menstrualCyclePhase.value` is a string ("Follicular", "Luteal", etc.), not a float. All other new metrics are floats. All new fields default to `[]` for backward compatibility with DB docs that predate this change.

**Step 1: Add `StringMetricDataPoint` model above `AcuteMetrics`**

Add after the `LongitudinalDataPoint` class (line 18):

```python
class StringMetricDataPoint(BaseModel):
    date: str
    value: str
    unit: str
    flag: Union[str, None] = None
```

**Step 2: Add 4 new fields to `AcuteMetrics`**

Append to `AcuteMetrics` class (after `sleepAnalysis_awakeSegments`):

```python
    bloodOxygenSaturation: list[MetricDataPoint] = []
    walkingStepLength: list[MetricDataPoint] = []
    walkingDoubleSupportPercentage: list[MetricDataPoint] = []
    menstrualCyclePhase: list[StringMetricDataPoint] = []
```

**Step 3: Add 3 new fields to `LongitudinalMetrics`**

`menstrualCyclePhase` is categorical — no longitudinal average makes clinical sense. Append to `LongitudinalMetrics`:

```python
    bloodOxygenSaturation: list[LongitudinalDataPoint] = []
    walkingStepLength: list[LongitudinalDataPoint] = []
    walkingDoubleSupportPercentage: list[LongitudinalDataPoint] = []
```

**Step 4: Verify the models load without errors**

```bash
cd /Users/user/Desktop/diagnostic/back-end
python -c "from app.models.patient import AcuteMetrics, LongitudinalMetrics, StringMetricDataPoint; print('OK')"
```

Expected output: `OK`

---

## Task 2: Register New Metrics in the Analysis Pipeline

**Files:**
- Modify: `back-end/app/routes/analyze.py`

**Context:** `_compute_biometric_deltas` iterates `SHARED_METRICS` (both acute + longitudinal) and `ACUTE_ONLY_METRICS` (acute split). `menstrualCyclePhase` is string-valued and must be **excluded** from delta computation entirely. The new numeric metrics have both acute and longitudinal series → add to `SHARED_METRICS`.

**Step 1: Add thresholds for new numeric metrics**

In the `THRESHOLDS` dict (after line 33 in `analyze.py`), add:

```python
    "bloodOxygenSaturation": {"value": 2, "unit": "%"},           # 2 pp drop is clinically significant
    "walkingStepLength": {"value": 0.05, "unit": "meters"},       # 5 cm shortening is significant
    "walkingDoubleSupportPercentage": {"value": 3, "unit": "%"},  # 3 pp increase indicates guarding
```

**Step 2: Add new metrics to `SHARED_METRICS`**

Change line 36 from:

```python
SHARED_METRICS = {"restingHeartRate", "walkingAsymmetryPercentage"}
```

to:

```python
SHARED_METRICS = {
    "restingHeartRate",
    "walkingAsymmetryPercentage",
    "bloodOxygenSaturation",
    "walkingStepLength",
    "walkingDoubleSupportPercentage",
}
```

**Step 3: Verify analyze.py imports cleanly**

```bash
cd /Users/user/Desktop/diagnostic/back-end
python -c "from app.routes.analyze import SHARED_METRICS, THRESHOLDS; print(SHARED_METRICS)"
```

Expected: set containing all 5 metric names.

---

## Task 3: Add New Metrics to the Mock Biometric Fallback

**Files:**
- Modify: `back-end/app/routes/intake.py`

**Context:** `_build_mock_biometric_data()` returns the Amara Osei demo payload used when Apple Watch data is absent. It must be expanded to include the 4 new metrics in `AcuteMetrics`. Only `bloodOxygenSaturation`, `walkingStepLength`, and `walkingDoubleSupportPercentage` also need longitudinal series (added to `LongitudinalMetrics`).

**Step 1: Add imports for new models at top of file**

The import block already imports `AcuteMetrics`, `LongitudinalMetrics`, `MetricDataPoint`, `LongitudinalDataPoint`. Add `StringMetricDataPoint` to that import:

```python
from app.models.patient import (
    AnalysisResponse,
    PatientPayload,
    PatientData,
    AcuteData,
    AcuteMetrics,
    LongitudinalData,
    LongitudinalMetrics,
    MetricDataPoint,
    LongitudinalDataPoint,
    StringMetricDataPoint,          # new
)
```

**Step 2: Add new fields to `AcuteMetrics(...)` inside `_build_mock_biometric_data()`**

After `sleepAnalysis_awakeSegments=[...]`, add:

```python
                bloodOxygenSaturation=[
                    MetricDataPoint(date="2026-02-15", value=98.0, unit="%"),
                    MetricDataPoint(date="2026-02-16", value=97.8, unit="%"),
                    MetricDataPoint(date="2026-02-17", value=98.1, unit="%"),
                    MetricDataPoint(date="2026-02-18", value=95.2, unit="%", flag="dip_detected"),
                    MetricDataPoint(date="2026-02-19", value=95.5, unit="%"),
                    MetricDataPoint(date="2026-02-20", value=96.2, unit="%"),
                    MetricDataPoint(date="2026-02-21", value=96.8, unit="%"),
                ],
                walkingStepLength=[
                    MetricDataPoint(date="2026-02-15", value=0.72, unit="meters"),
                    MetricDataPoint(date="2026-02-16", value=0.71, unit="meters"),
                    MetricDataPoint(date="2026-02-17", value=0.72, unit="meters"),
                    MetricDataPoint(date="2026-02-18", value=0.58, unit="meters", flag="shortened_stride"),
                    MetricDataPoint(date="2026-02-19", value=0.59, unit="meters"),
                    MetricDataPoint(date="2026-02-20", value=0.63, unit="meters"),
                    MetricDataPoint(date="2026-02-21", value=0.65, unit="meters"),
                ],
                walkingDoubleSupportPercentage=[
                    MetricDataPoint(date="2026-02-15", value=22.1, unit="%"),
                    MetricDataPoint(date="2026-02-16", value=22.3, unit="%"),
                    MetricDataPoint(date="2026-02-17", value=22.0, unit="%"),
                    MetricDataPoint(date="2026-02-18", value=31.5, unit="%", flag="guarding_gait"),
                    MetricDataPoint(date="2026-02-19", value=30.8, unit="%"),
                    MetricDataPoint(date="2026-02-20", value=27.2, unit="%"),
                    MetricDataPoint(date="2026-02-21", value=25.4, unit="%"),
                ],
                menstrualCyclePhase=[
                    StringMetricDataPoint(date="2026-02-15", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-16", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-17", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-18", value="Luteal", unit="phase", flag="peak_progesterone"),
                    StringMetricDataPoint(date="2026-02-19", value="Luteal", unit="phase", flag="peak_progesterone"),
                    StringMetricDataPoint(date="2026-02-20", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-21", value="Menstrual", unit="phase"),
                ],
```

**Step 3: Add new fields to `LongitudinalMetrics(...)` inside `_build_mock_biometric_data()`**

After the `walkingAsymmetryPercentage=[...]` list, add 26 weeks of data for each new longitudinal metric. Use compact list comprehension format to avoid bloating the file — these are stable baselines:

```python
                bloodOxygenSaturation=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=98.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=98.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=97.8, unit="%"),
                ],
                walkingStepLength=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=0.70, unit="meters"),
                ],
                walkingDoubleSupportPercentage=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=22.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=22.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=22.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=22.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=22.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=22.6, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=22.6, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=22.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=22.6, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=22.4, unit="%"),
                ],
```

**Step 4: Verify server starts cleanly**

```bash
cd /Users/user/Desktop/diagnostic/back-end
python -c "from app.routes.intake import _build_mock_biometric_data; d = _build_mock_biometric_data(); print('SpO2 count:', len(d.acute_7_day.metrics.bloodOxygenSaturation))"
```

Expected: `SpO2 count: 7`

---

## Task 4: Add New Metrics to Seed Script

**Files:**
- Modify: `back-end/seed_mock_patients.py`

**Context:** `create_patient_and_appointment()` currently builds `acute_metrics` and `long_metrics` dicts.  We need to add 4 new keys to `acute_metrics` and 3 new keys to `long_metrics`. Each patient has a different clinical profile that should drive realistic values.

### Clinical Data Design Rationale

| Patient | Condition | SpO2 pattern | Step Length | DSP | Menstrual Phase |
|---------|-----------|--------------|-------------|-----|-----------------|
| Amara (Endo) | Luteal guarding | Normal 97-98% | Shortened on crisis days | Elevated during flare | Luteal → Menstrual |
| Maria (Fibroids+Anemia) | Chronic blood loss | **Low 92-94%** | Slightly shortened | Mildly elevated | Follicular (heavy bleed) |
| Jordan (POTS) | Orthostatic | Normal at rest | Erratic | Erratic | Follicular |
| David (PsA) | Joint inflammation | Normal | **Shortened 0.58m** | **Elevated 28-32%** | N/A (male) |
| Elijah (Sleep Apnea) | Nocturnal hypoxemia | **Very low 88-93%** | Normal | Normal | N/A (male) |
| Priya (PCOS) | Anovulatory | Normal | Normal | Normal | **Erratic/Anovulatory** |

**Step 1: Update `create_patient_and_appointment()` to generate new acute metrics**

In `create_patient_and_appointment()`, after the 7 existing `acute_metrics` keys, add:

```python
        "bloodOxygenSaturation": generate_metric(acute_dates, **a_conf["spo2"], unit="%"),
        "walkingStepLength": generate_metric(acute_dates, **a_conf["step_len"], unit="meters"),
        "walkingDoubleSupportPercentage": generate_metric(acute_dates, **a_conf["dsp"], unit="%"),
        "menstrualCyclePhase": a_conf.get("menstrual_phase_series", []),
```

**Step 2: Update `create_patient_and_appointment()` to generate new longitudinal metrics**

After the 2 existing `long_metrics` keys, add:

```python
        "bloodOxygenSaturation": generate_metric(long_dates, **l_conf["spo2"], unit="%"),
        "walkingStepLength": generate_metric(long_dates, **l_conf["step_len"], unit="meters"),
        "walkingDoubleSupportPercentage": generate_metric(long_dates, **l_conf["dsp"], unit="%"),
```

**Step 3: Add new config keys to Amara (Endometriosis)**

In the `amara` dict, update `acute_config` by adding:

```python
        "spo2": {"base": 97.8, "noise": 0.3, "spikes": {4: (95.2, "dip_detected"), 5: (95.5, "dip_detected")}},
        "step_len": {"base": 0.72, "noise": 0.02, "spikes": {4: (0.58, "shortened_stride"), 5: (0.57, "shortened_stride"), 6: (0.61, "shortened_stride")}},
        "dsp": {"base": 22.0, "noise": 0.5, "spikes": {4: (31.5, "guarding_gait"), 5: (32.0, "guarding_gait"), 6: (29.8, "guarding_gait")}},
        "menstrual_phase_series": [
            {"date": acute_dates[0], "value": "Luteal", "unit": "phase"},
            {"date": acute_dates[1], "value": "Luteal", "unit": "phase"},
            {"date": acute_dates[2], "value": "Luteal", "unit": "phase"},
            {"date": acute_dates[3], "value": "Luteal", "unit": "phase", "flag": "peak_progesterone"},
            {"date": acute_dates[4], "value": "Luteal", "unit": "phase", "flag": "peak_progesterone"},
            {"date": acute_dates[5], "value": "Luteal", "unit": "phase"},
            {"date": acute_dates[6], "value": "Menstrual", "unit": "phase"},
        ],
```

**NOTE:** `menstrual_phase_series` references `acute_dates` which is a local variable. Move the config dicts for all patients to inside `create_patient_and_appointment()` after `acute_dates` is computed, OR pass `acute_dates` to each config. **Cleanest approach:** Move `menstrual_phase_series` generation inline inside `create_patient_and_appointment()` for each patient, keyed off `pt_data["condition"]`. Alternatively, use a simpler approach — store the phase values as a list of strings in `pt_data` and generate the dict series inside the function.

**Recommended approach for menstrual_phase_series:** Store in `pt_data` as a list of 7 string values:

```python
"menstrual_phases": ["Luteal", "Luteal", "Luteal", "Luteal", "Luteal", "Luteal", "Menstrual"],
```

Then in `create_patient_and_appointment()`:

```python
        menstrual_raw = pt_data.get("menstrual_phases", [])
        menstrual_series = [
            {"date": acute_dates[i], "value": phase, "unit": "phase"}
            for i, phase in enumerate(menstrual_raw)
        ] if menstrual_raw else []
        acute_metrics["menstrualCyclePhase"] = menstrual_series
```

And in `patient_payload` construction, it will be included automatically.

Update `long_config` for Amara to add:

```python
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.72, "noise": 0.01},
        "dsp": {"base": 22.0, "noise": 0.4},
```

**Step 4: Add config keys to Maria (Fibroids+Anemia) — low SpO2**

```python
# acute_config additions:
        "spo2": {"base": 93.5, "noise": 0.8, "spikes": {5: (91.2, "hypoxia_risk"), 6: (91.8, "hypoxia_risk")}},
        "step_len": {"base": 0.68, "noise": 0.02},
        "dsp": {"base": 24.5, "noise": 0.5},
# menstrual_phases:
        "menstrual_phases": ["Menstrual", "Menstrual", "Menstrual", "Follicular", "Follicular", "Follicular", "Follicular"],
# long_config additions:
        "spo2": {"base": 95.5, "noise": 0.5, "trend": -0.1},  # slowly declining
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 23.5, "noise": 0.4},
```

**Step 5: Add config keys to Jordan (POTS)**

```python
# acute_config additions:
        "spo2": {"base": 97.5, "noise": 1.0},  # erratic from autonomic instability
        "step_len": {"base": 0.68, "noise": 0.04},
        "dsp": {"base": 23.5, "noise": 1.0},
# menstrual_phases:
        "menstrual_phases": ["Follicular", "Follicular", "Follicular", "Follicular", "Ovulatory", "Follicular", "Follicular"],
# long_config additions:
        "spo2": {"base": 97.5, "noise": 0.5},
        "step_len": {"base": 0.70, "noise": 0.03},
        "dsp": {"base": 23.0, "noise": 0.5},
```

**Step 6: Add config keys to David (PsA) — joint deterioration**

```python
# acute_config additions:
        "spo2": {"base": 97.8, "noise": 0.3},
        "step_len": {"base": 0.62, "noise": 0.03, "spikes": {3: (0.55, "joint_limited"), 4: (0.54, "joint_limited"), 5: (0.55, "joint_limited")}},
        "dsp": {"base": 29.0, "noise": 0.8, "spikes": {3: (33.5, "guarding_gait"), 4: (34.2, "guarding_gait")}},
# menstrual_phases: empty (male patient)
        "menstrual_phases": [],
# long_config additions:
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.02, "trend": -0.003},  # gradual shortening
        "dsp": {"base": 24.0, "noise": 0.5, "trend": 0.2},           # gradual increase
```

**Step 7: Add config keys to Elijah (Sleep Apnea) — severe nocturnal hypoxemia**

```python
# acute_config additions:
        "spo2": {"base": 91.0, "noise": 1.5, "spikes": {1: (88.2, "critical_drop"), 3: (87.5, "critical_drop"), 5: (89.0, "critical_drop")}},
        "step_len": {"base": 0.71, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
# menstrual_phases: empty (male patient)
        "menstrual_phases": [],
# long_config additions:
        "spo2": {"base": 94.5, "noise": 1.0, "trend": -0.1},  # worsening over 6mo
        "step_len": {"base": 0.71, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.3},
```

**Step 8: Add config keys to Priya (PCOS) — anovulatory**

```python
# acute_config additions:
        "spo2": {"base": 97.8, "noise": 0.3},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
# menstrual_phases: erratic/anovulatory (no clean biphasic pattern)
        "menstrual_phases": ["Follicular", "Follicular", "Late_Follicular", "Anovulatory", "Anovulatory", "Anovulatory", "Late_Follicular"],
# long_config additions:
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.3},
```

**Step 9: Run seeding to verify no errors**

```bash
cd /Users/user/Desktop/diagnostic/back-end
python seed_mock_patients.py
```

Expected: `Database seeded successfully with 6 mock patients.`

---

## Task 5: Add Appointment Dashboard Endpoint (Read Path)

**Files:**
- Modify: `back-end/app/routes/appointments.py`

**Context:** The spec calls for `GET /api/v1/appointments/{id}` that returns pre-computed `AnalysisResponse`. The existing route `GET /api/v1/appointments/{patient_id}` already occupies that URL pattern and returns `list[AppointmentRecord]`.

To avoid a route collision (FastAPI would always hit the existing route), use a sub-path: `GET /api/v1/appointments/{id}/dashboard`. This is more semantically correct REST and avoids breaking the existing patient-appointment list endpoint.

**Step 1: Add `AnalysisResponse` import to appointments.py**

Add to the existing imports:

```python
from app.models.patient import AnalysisResponse
```

**Step 2: Add the new route at the bottom of appointments.py**

```python
@router.get("/appointments/{id}/dashboard", response_model=AnalysisResponse)
async def get_appointment_dashboard(id: str, request: Request):
    """Return pre-computed analysis for a specific appointment.

    Reads the analysis_result stored during intake submission.
    Does NOT trigger LLM or vector search — lightweight read path only.
    """
    db = request.app.state.mongo_client[request.app.state.db_name]

    appointment = db.appointments.find_one({"id": id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    analysis = appointment.get("analysis_result")
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not yet available for this appointment.",
        )

    return AnalysisResponse(**analysis)
```

**Step 3: Verify server starts and route is registered**

```bash
cd /Users/user/Desktop/diagnostic/back-end
uvicorn app.main:app --port 8000 &
sleep 3
curl -s http://localhost:8000/openapi.json | python -c "import sys, json; routes = [r['path'] for r in json.load(sys.stdin)['paths']]; print([r for r in routes if 'dashboard' in r])"
kill %1
```

Expected: List containing `['/api/v1/appointments/{id}/dashboard', '/api/v1/patients/{patient_id}/dashboard']`

---

## Task 6: Final Integration Smoke Test

**Step 1: Verify models, routes, and seed all work together**

```bash
cd /Users/user/Desktop/diagnostic/back-end
python -c "
from app.models.patient import AcuteMetrics, LongitudinalMetrics, StringMetricDataPoint, PatientPayload
m = AcuteMetrics(
    heartRateVariabilitySDNN=[],
    restingHeartRate=[],
    appleSleepingWristTemperature=[],
    respiratoryRate=[],
    walkingAsymmetryPercentage=[],
    stepCount=[],
    sleepAnalysis_awakeSegments=[],
    bloodOxygenSaturation=[],
    walkingStepLength=[],
    walkingDoubleSupportPercentage=[],
    menstrualCyclePhase=[],
)
print('AcuteMetrics OK — fields:', list(m.model_fields.keys()))
"
```

Expected: All 11 fields listed with no import errors.

**Step 2: Verify the server starts cleanly with no import errors**

```bash
cd /Users/user/Desktop/diagnostic/back-end
python -c "import app.main; print('Server module OK')"
```

Expected: `Server module OK`

---

## Summary of Changes

| File | Change |
|------|--------|
| `app/models/patient.py` | Add `StringMetricDataPoint`; add 4 fields to `AcuteMetrics`; add 3 fields to `LongitudinalMetrics` |
| `app/routes/analyze.py` | Add 3 new thresholds; expand `SHARED_METRICS` set |
| `app/routes/intake.py` | Import `StringMetricDataPoint`; add 4 new fields to mock fallback data (acute + longitudinal) |
| `seed_mock_patients.py` | Add `spo2`, `step_len`, `dsp`, `menstrual_phases` configs per patient; wire into `create_patient_and_appointment()` |
| `app/routes/appointments.py` | Add `GET /api/v1/appointments/{id}/dashboard` read-only endpoint |

**main.py** — No changes needed. Routes are already registered.
