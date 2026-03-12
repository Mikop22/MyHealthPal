import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "diagnostic")

print(f"Connecting to MongoDB at {MONGO_URI}, DB: {DB_NAME}")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def get_acute_dates(end_date_str, days=7):
    end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
    return [(end_date - timedelta(days=i)).strftime('%Y-%m-%d') for i in reversed(range(1, days+1))]

def get_long_dates(end_date_str, weeks=26):
    end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
    # find latest sunday
    while end_date.weekday() != 6:
        end_date -= timedelta(days=1)
    return [(end_date - timedelta(weeks=i)).strftime('%Y-%m-%d') for i in reversed(range(weeks))]

def generate_metric(dates, base, noise, unit, spikes=None, trend=0.0):
    metrics = []
    current_base = base
    for i, date in enumerate(dates):
        current_base += trend
        val = current_base + random.uniform(-noise, noise)
        flag = None
        
        if spikes and i in spikes:
            spike_val, spike_flag = spikes[i]
            if spike_val is not None:
                val = spike_val
            flag = spike_flag
            
        metric = {
            "date" if len(dates) == 7 else "week_start": date,
            "value": round(val, 2) if unit != "count" else int(val),
            "unit": unit
        }
        if flag:
            metric["flag" if len(dates) == 7 else "trend"] = flag
        metrics.append(metric)
    return metrics

def create_patient_and_appointment(pt_data):
    patient_id = f"pt_mock_{str(uuid.uuid4())[:8]}"
    form_token = str(uuid.uuid4())
    xrp_address = f"rMock{str(uuid.uuid4()).replace('-', '')[:16]}"
    
    now = datetime.now(timezone.utc).isoformat()
    
    # 1. Generate Acute Metrics
    acute_dates = get_acute_dates("2026-03-10", 7)
    long_dates = get_long_dates("2026-03-10", 26)
    
    a_conf = pt_data["acute_config"]
    acute_metrics = {
        "heartRateVariabilitySDNN": generate_metric(acute_dates, **a_conf["hrv"], unit="ms"),
        "restingHeartRate": generate_metric(acute_dates, **a_conf["rhr"], unit="bpm"),
        "appleSleepingWristTemperature": generate_metric(acute_dates, **a_conf["temp"], unit="degC_deviation"),
        "respiratoryRate": generate_metric(acute_dates, **a_conf["rr"], unit="breaths/min"),
        "walkingAsymmetryPercentage": generate_metric(acute_dates, **a_conf["walk"], unit="%"),
        "stepCount": generate_metric(acute_dates, **a_conf["steps"], unit="count"),
        "sleepAnalysis_awakeSegments": generate_metric(acute_dates, **a_conf["sleep"], unit="count"),
        "bloodOxygenSaturation": generate_metric(acute_dates, **a_conf["spo2"], unit="%"),
        "walkingStepLength": generate_metric(acute_dates, **a_conf["step_len"], unit="meters"),
        "walkingDoubleSupportPercentage": generate_metric(acute_dates, **a_conf["dsp"], unit="%"),
    }

    l_conf = pt_data["long_config"]
    long_metrics = {
        "restingHeartRate": generate_metric(long_dates, **l_conf["rhr"], unit="bpm"),
        "walkingAsymmetryPercentage": generate_metric(long_dates, **l_conf["walk"], unit="%"),
        "bloodOxygenSaturation": generate_metric(long_dates, **l_conf["spo2"], unit="%"),
        "walkingStepLength": generate_metric(long_dates, **l_conf["step_len"], unit="meters"),
        "walkingDoubleSupportPercentage": generate_metric(long_dates, **l_conf["dsp"], unit="%"),
    }

    # Generate menstrual cycle phase series (string-valued; excluded from numeric delta computation)
    menstrual_raw = pt_data.get("menstrual_phases", [])
    menstrual_series = [
        {"date": acute_dates[i], "value": phase, "unit": "phase"}
        for i, phase in enumerate(menstrual_raw)
    ] if menstrual_raw else []
    acute_metrics["menstrualCyclePhase"] = menstrual_series

    patient_payload = {
        "patient_id": patient_id,
        "sync_timestamp": now,
        "hardware_source": "Apple Watch Series 9",
        "patient_narrative": pt_data["narrative"],
        "data": {
            "acute_7_day": {
                "granularity": "daily_summary",
                "metrics": acute_metrics
            },
            "longitudinal_6_month": {
                "granularity": "weekly_average",
                "metrics": long_metrics
            }
        },
        "risk_profile": pt_data["risk_profile"]
    }
    
    analysis_result = {
        "patient_id": patient_id,
        "clinical_brief": pt_data["clinical_brief"],
        "biometric_deltas": pt_data["deltas"],
        "condition_matches": pt_data["conditions"],
        "risk_profile": pt_data["risk_profile"]
    }

    patient_record = {
        "id": patient_id,
        "name": pt_data["name"],
        "email": pt_data["name"].split(' ')[0].lower() + "@example.com",
        "xrp_wallet_address": xrp_address,
        "xrp_wallet_seed": "sMockSeed...",
        "created_at": now,
        "status": "completed",
        "concern": pt_data.get("clinical_brief", {}).get("primary_concern", pt_data["narrative"][:50] + "...")
    }
    
    appointment_record = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "date": "2026-03-10",
        "time": pt_data["time"],
        "status": "completed",
        "form_token": form_token,
        "created_at": now,
        "patient_payload": patient_payload,
        "analysis_result": analysis_result
    }
    
    return patient_record, appointment_record

# PATIENT 1: Amara Osei - Endometriosis
amara = {
    "name": "Amara Osei",
    "time": "09:15",
    "narrative": "Complains of severe, stabbing pelvic pain that radiates down her leg, dismissed previously as 'normal cramps.'",
    "risk_profile": {"factors": [
        {"category": "Reproductive", "factor": "Family History of Endometriosis", "description": "Mother diagnosed with stage IV endometriosis at age 32, required hysterectomy.", "severity": "High", "weight": 85},
        {"category": "Hormonal", "factor": "Early Menarche", "description": "Onset of menstruation at age 10, increasing lifetime estrogen exposure.", "severity": "Elevated", "weight": 65},
        {"category": "Inflammatory", "factor": "Chronic Pelvic Inflammation", "description": "Elevated CRP levels detected in prior bloodwork, consistent with systemic inflammatory response.", "severity": "High", "weight": 78},
        {"category": "Behavioral", "factor": "Delayed Diagnosis", "description": "7-year history of dismissed pain complaints across 4 providers.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 45, "noise": 3, "spikes": {4: (20, "crashed"), 5: (22, "crashed"), 6: (21, "crashed")}},
        "rhr": {"base": 65, "noise": 2, "spikes": {5: (75, "elevated")}},
        "temp": {"base": 0.1, "noise": 0.1, "spikes": {4: (0.9, "sustained_high"), 5: (1.1, "sustained_high"), 6: (0.8, "sustained_high")}},
        "rr": {"base": 14, "noise": 0.5},
        "walk": {"base": 1.2, "noise": 0.2, "spikes": {4: (8.5, "guarding_detected"), 5: (9.2, "guarding_detected"), 6: (8.8, "guarding_detected")}},
        "steps": {"base": 8000, "noise": 500, "spikes": {4: (2000, "mobility_drop"), 5: (1500, "mobility_drop"), 6: (1800, "mobility_drop")}},
        "sleep": {"base": 1, "noise": 1, "spikes": {4: (5, "painsomnia"), 5: (6, "painsomnia"), 6: (5, "painsomnia")}},
        "spo2": {"base": 97.8, "noise": 0.3, "spikes": {4: (95.2, "dip_detected"), 5: (95.5, "dip_detected")}},
        "step_len": {"base": 0.72, "noise": 0.02, "spikes": {4: (0.58, "shortened_stride"), 5: (0.57, "shortened_stride"), 6: (0.61, "shortened_stride")}},
        "dsp": {"base": 22.0, "noise": 0.5, "spikes": {4: (31.5, "guarding_gait"), 5: (32.0, "guarding_gait"), 6: (29.8, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 64, "noise": 1.5, "trend": 0},
        "walk": {"base": 1.2, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.72, "noise": 0.01},
        "dsp": {"base": 22.0, "noise": 0.4},
    },
    "menstrual_phases": ["Luteal", "Luteal", "Luteal", "Luteal", "Luteal", "Luteal", "Menstrual"],
    "clinical_brief": {
        "primary_concern": "Severe Pelvic & Leg Pain",
        "clinical_intake": "Patient presents with severe, stabbing pelvic pain radiating down her leg. Historically dismissed as normal cramps.",
        "summary": "Patient presents with severe cyclic pelvic and radiating leg pain with acute biometric decomposition over the past 3 days. Walking asymmetry spiked 383% above baseline, wrist temperature sustained +0.8\u00b0C deviation, and sleep fragmentation increased 5x — collectively indicating an acute inflammatory or endometriotic flare.",
        "key_symptoms": ["Severe stabbing pelvic pain radiating to left leg", "Cyclic pain pattern worsening during luteal phase", "Significant gait guarding and mobility impairment", "Sleep fragmentation due to nocturnal pain episodes", "Sustained low-grade inflammatory temperature elevation"],
        "severity_assessment": "High",
        "recommended_actions": ["Urgent transvaginal ultrasound with Doppler", "Consult gynecology specialist for laparoscopic evaluation", "Serum CA-125 and inflammatory marker panel (CRP, ESR)", "Pain management reassessment — current regimen inadequate"],
        "cited_sources": ["PMC8765432: Atypical Presentations of Endometriosis", "PMC6234891: Digital Biomarkers for Pelvic Pain Conditions", "PMC4412078: Walking Asymmetry as Guarding Indicator"],
        "guiding_questions": ["Has the pain worsened specifically during the luteal or menstrual phase?", "Is there any history of painful intercourse (dyspareunia)?", "How many days per month does the pain prevent normal daily activities?", "Have you experienced any gastrointestinal symptoms alongside the pain (bloating, painful bowel movements)?", "Were previous providers' assessments documented, and were imaging studies ever performed?"]
    },
    "deltas": [
        {"metric": "walkingAsymmetryPercentage", "acute_avg": 5.8, "longitudinal_avg": 1.2, "delta": 4.6, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "up"},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.6, "longitudinal_avg": 0.1, "delta": 0.5, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 21.0, "longitudinal_avg": 45.0, "delta": -24.0, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "down"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 5.3, "longitudinal_avg": 1.2, "delta": 4.1, "unit": "count", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "stepCount", "acute_avg": 1767, "longitudinal_avg": 8000, "delta": -6233, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "down"}
    ],
    "conditions": [
        {"condition": "Deep-Infiltrating Endometriosis", "similarity_score": 0.89, "pmcid": "PMC8765432", "title": "Atypical Presentations of Endometriosis", "snippet": "Radiating leg pain and pelvic guarding correspond heavily to deep-infiltrating endometriosis implants affecting the sciatic nerve."},
        {"condition": "Adenomyosis", "similarity_score": 0.76, "pmcid": "PMC6234891", "title": "Adenomyosis vs Endometriosis: Differential Biometric Signatures", "snippet": "Sustained temperature elevation with cyclic pain intensification distinguishes adenomyosis from superficial endometriosis."},
        {"condition": "Pelvic Inflammatory Disease", "similarity_score": 0.62, "pmcid": "PMC4412078", "title": "Acute Pelvic Inflammatory Presentations", "snippet": "Acute-onset walking asymmetry combined with temperature deviation may indicate pelvic inflammatory etiology."}
    ]
}

# PATIENT 2: Maria Santos - Uterine Fibroids (Anemia)
maria = {
    "name": "Maria Santos",
    "time": "11:45",
    "narrative": "Extreme fatigue, heavy bleeding, shortness of breath when walking up stairs.",
    "risk_profile": {"factors": [
        {"category": "Hematological", "factor": "Chronic Menorrhagia", "description": "Self-reported soaking through pads every 45 minutes during peak flow days for 18+ months.", "severity": "High", "weight": 82},
        {"category": "Cardiovascular", "factor": "Compensatory Tachycardia", "description": "RHR creeping from 65 to 85 bpm over 6 months — body compensating for reduced oxygen-carrying capacity.", "severity": "High", "weight": 78},
        {"category": "Nutritional", "factor": "Iron Deficiency Risk", "description": "Diet history indicates low iron intake; no supplementation despite heavy menstrual losses.", "severity": "Elevated", "weight": 60},
        {"category": "Functional", "factor": "Progressive Exercise Intolerance", "description": "Step count declining 500+ steps/week over 6 months, indicating worsening cardiovascular reserve.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 30, "noise": 2},
        "rhr": {"base": 85, "noise": 3},
        "temp": {"base": 0.0, "noise": 0.1},
        "rr": {"base": 16, "noise": 0.5, "spikes": {5: (20, "elevated"), 6: (19, "elevated")}},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 6000, "noise": 300, "trend": -500},
        "sleep": {"base": 2, "noise": 1},
        "spo2": {"base": 93.5, "noise": 0.8, "spikes": {5: (91.2, "hypoxia_risk"), 6: (91.8, "hypoxia_risk")}},
        "step_len": {"base": 0.68, "noise": 0.02},
        "dsp": {"base": 24.5, "noise": 0.5},
    },
    "long_config": {
        "rhr": {"base": 65, "noise": 1.0, "trend": 0.8, "spikes": {25: (None, "creeping_elevation")}},
        "walk": {"base": 1.5, "noise": 0.1, "trend": 0},
        "spo2": {"base": 95.5, "noise": 0.5, "trend": -0.1},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 23.5, "noise": 0.4},
    },
    "menstrual_phases": ["Menstrual", "Menstrual", "Menstrual", "Follicular", "Follicular", "Follicular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Menorrhagia & Fatigue",
        "clinical_intake": "Patient reports extreme fatigue, heavy bleeding soaking through pads rapidly, and shortness of breath upon exertion.",
        "summary": "Symptomatic anemia strongly correlated with suspected uterine fibroids. Longitudinal data reveals a 6-month creeping RHR elevation from 65 to 85 bpm — the body progressively compensating for reduced hemoglobin. Acute step count has dropped 44% from baseline, confirming functional cardiovascular decompensation.",
        "key_symptoms": ["Extreme fatigue unrelieved by rest", "Shortness of breath climbing a single flight of stairs", "Menorrhagia — soaking through protection every 45 minutes", "Orthostatic lightheadedness upon standing", "Progressive exercise intolerance over 6 months"],
        "severity_assessment": "High",
        "recommended_actions": ["Stat CBC with iron studies, ferritin, and reticulocyte count", "Pelvic ultrasound to evaluate fibroid burden and uterine size", "Cardiology consult if hemoglobin < 8 g/dL", "Initiate IV iron infusion if oral iron not tolerated"],
        "cited_sources": ["PMC5555555: Impact of Fibroids on Cardiovascular Metrics", "PMC3378201: Iron Deficiency Anemia in Premenopausal Women", "PMC7721903: Digital Biomarkers of Anemia Progression"],
        "guiding_questions": ["How many pads or tampons do you use on your heaviest day, and how often do you change them?", "Have you noticed your heart racing when walking short distances or climbing stairs?", "Have you experienced any pica cravings (ice, clay, starch) — a hallmark sign of severe iron deficiency?", "When was your last complete blood count, and were you told your hemoglobin was low?", "Have you ever been prescribed iron supplements, and if so, did you experience side effects?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 85, "longitudinal_avg": 73, "delta": 12, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "stepCount", "acute_avg": 4500, "longitudinal_avg": 8000, "delta": -3500, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "respiratoryRate", "acute_avg": 19.5, "longitudinal_avg": 15.2, "delta": 4.3, "unit": "breaths/min", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 28, "longitudinal_avg": 42, "delta": -14, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None}
    ],
    "conditions": [
        {"condition": "Uterine Fibroids with Secondary Anemia", "similarity_score": 0.85, "pmcid": "PMC5555555", "title": "Impact of Fibroids on Cardiovascular Metrics", "snippet": "Chronic blood loss from fibroids frequently presents with a gradual rise in resting heart rate as the body compensates for reduced oxygen-carrying capacity."},
        {"condition": "Iron Deficiency Anemia (Non-Fibroid)", "similarity_score": 0.72, "pmcid": "PMC3378201", "title": "Anemia in Premenopausal Women: Differential Diagnosis", "snippet": "Menorrhagia-induced iron deficiency presents with progressive tachycardia and exercise intolerance before symptomatic pallor."},
        {"condition": "Endometrial Hyperplasia", "similarity_score": 0.58, "pmcid": "PMC7721903", "title": "Heavy Uterine Bleeding: Beyond Fibroids", "snippet": "Endometrial hyperplasia should be considered when menorrhagia occurs alongside metabolic compensation patterns."}
    ]
}

# PATIENT 3: Jordan Lee - POTS
jordan = {
    "name": "Jordan Lee",
    "time": "08:30",
    "narrative": "Dizziness when standing up, brain fog, racing heart after mild exertion.",
    "risk_profile": {"factors": [
        {"category": "Immunological", "factor": "Post-Viral Autoimmune Trigger", "description": "Severe viral illness 3 months ago with incomplete recovery — common POTS precipitant.", "severity": "High", "weight": 80},
        {"category": "Autonomic", "factor": "Erratic Heart Rate Variability", "description": "HRV swinging between 10-50ms within single days, indicating autonomic nervous system instability.", "severity": "High", "weight": 75},
        {"category": "Cardiovascular", "factor": "Orthostatic Tachycardia", "description": "RHR spikes to 110 bpm recorded without exertion, consistent with postural hemodynamic failure.", "severity": "Elevated", "weight": 70},
        {"category": "Neurological", "factor": "Cognitive Dysfunction", "description": "Self-reported 'brain fog' impairing work performance and daily decision-making.", "severity": "Moderate", "weight": 50},
    ]},
    "acute_config": {
        "hrv": {"base": 20, "noise": 15, "spikes": {1: (15, "crashed"), 4: (10, "crashed"), 6: (12, "crashed")}},
        "rhr": {"base": 75, "noise": 20, "spikes": {2: (110, "extreme_erratic"), 5: (105, "extreme_erratic")}},
        "temp": {"base": 0.0, "noise": 0.1},
        "rr": {"base": 14, "noise": 0.5},
        "walk": {"base": 1.0, "noise": 0.2},
        "steps": {"base": 5000, "noise": 1000},
        "sleep": {"base": 2, "noise": 1},
        "spo2": {"base": 97.5, "noise": 1.0},
        "step_len": {"base": 0.68, "noise": 0.04},
        "dsp": {"base": 23.5, "noise": 1.0},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 5, "trend": 0},
        "walk": {"base": 1.0, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.5},
        "step_len": {"base": 0.70, "noise": 0.03},
        "dsp": {"base": 23.0, "noise": 0.5},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Follicular", "Follicular", "Ovulatory", "Follicular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Orthostatic Dizziness & Tachycardia",
        "clinical_intake": "Patient experiences severe dizziness upon standing, brain fog, and racing heart after mild exertion following a viral illness.",
        "summary": "Presents with highly erratic heart rate variability (swinging 10-50ms within days) and RHR spikes to 110 bpm independent of exertion. HRV has collapsed 67% below 6-month baseline. Pattern is consistent with post-viral autonomic dysfunction (POTS) — the body's fight-or-flight system is misfiring at rest.",
        "key_symptoms": ["Severe orthostatic dizziness — near-syncope upon standing", "Persistent cognitive dysfunction (brain fog) affecting work", "Inappropriate tachycardia to 110 bpm without physical exertion", "Exercise intolerance — unable to complete previously routine activities", "Post-exertional malaise lasting 24-48 hours"],
        "severity_assessment": "High",
        "recommended_actions": ["10-minute active standing test or tilt table test", "24-hour Holter monitor to quantify erratic HR episodes", "Autonomic reflex screening panel", "Trial of increased salt and fluid intake (2-3L/day)"],
        "cited_sources": ["PMC7777777: Autonomic Dysfunction Post-Infection", "PMC8834521: POTS Diagnostic Criteria and Wearable Correlates", "PMC6190234: Post-COVID Dysautonomia in Young Adults"],
        "guiding_questions": ["Does the racing heart occur specifically when you stand up from sitting or lying down?", "Have you noticed any improvement in symptoms with increased salt or fluid intake?", "How long after the viral illness did these symptoms begin — days, weeks, or gradually?", "Are the symptoms worse in the morning or after meals?", "Have you experienced any fainting episodes, or do you feel like you might faint?"]
    },
    "deltas": [
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 15, "longitudinal_avg": 45, "delta": -30, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 88, "longitudinal_avg": 70, "delta": 18, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "respiratoryRate", "acute_avg": 17.2, "longitudinal_avg": 14.5, "delta": 2.7, "unit": "breaths/min", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 4.0, "longitudinal_avg": 1.5, "delta": 2.5, "unit": "count", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None}
    ],
    "conditions": [
        {"condition": "Post-Viral POTS (Dysautonomia)", "similarity_score": 0.92, "pmcid": "PMC7777777", "title": "Autonomic Dysfunction Post-Infection", "snippet": "Characterized by erratic swings in heart rate and depressed HRV without fever, with onset 2-12 weeks post-viral illness."},
        {"condition": "Inappropriate Sinus Tachycardia", "similarity_score": 0.74, "pmcid": "PMC8834521", "title": "IST vs POTS: Differentiating via Wearable Data", "snippet": "IST presents with elevated resting HR independent of posture, distinguished from POTS by absence of orthostatic component."},
        {"condition": "Chronic Fatigue Syndrome (ME/CFS)", "similarity_score": 0.65, "pmcid": "PMC6190234", "title": "Post-Viral Fatigue Syndromes: Overlapping Presentations", "snippet": "Post-exertional malaise and cognitive dysfunction overlap significantly with dysautonomia presentations."}
    ]
}

# PATIENT 4: David Chen - Psoriatic Arthritis
david = {
    "name": "David Chen",
    "time": "10:30",
    "narrative": "Joint stiffness in the mornings, specifically in the knees and fingers, worsening over the last month.",
    "risk_profile": {"factors": [
        {"category": "Dermatological", "factor": "Active Plaque Psoriasis", "description": "Diagnosed with moderate plaque psoriasis 2 years ago — 30% of psoriasis patients develop PsA.", "severity": "High", "weight": 80},
        {"category": "Musculoskeletal", "factor": "Progressive Gait Deterioration", "description": "Walking asymmetry has crept from 2% to 7.5% over 6 months — joint damage accumulating silently.", "severity": "High", "weight": 75},
        {"category": "Inflammatory", "factor": "Nocturnal Pain Pattern", "description": "Sleep fragmentation spiking to 4-5 awakenings per night, consistent with inflammatory joint pain peaking at rest.", "severity": "Elevated", "weight": 62},
        {"category": "Genetic", "factor": "HLA-B27 Candidate", "description": "Family history of autoimmune conditions increases likelihood of spondyloarthropathy spectrum.", "severity": "Moderate", "weight": 50},
    ]},
    "acute_config": {
        "hrv": {"base": 40, "noise": 5},
        "rhr": {"base": 68, "noise": 2},
        "temp": {"base": 0.3, "noise": 0.1},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 7.5, "noise": 0.5, "spikes": {6: (8.0, "elevated_asymmetry")}},
        "steps": {"base": 6500, "noise": 500},
        "sleep": {"base": 1, "noise": 0.5, "spikes": {3: (4, "elevated"), 4: (5, "elevated"), 5: (4, "elevated")}},
        "spo2": {"base": 97.8, "noise": 0.3},
        "step_len": {"base": 0.62, "noise": 0.03, "spikes": {3: (0.55, "joint_limited"), 4: (0.54, "joint_limited"), 5: (0.55, "joint_limited")}},
        "dsp": {"base": 29.0, "noise": 0.8, "spikes": {3: (33.5, "guarding_gait"), 4: (34.2, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 65, "noise": 1.0, "trend": 0},
        "walk": {"base": 2.0, "noise": 0.2, "trend": 0.2, "spikes": {25: (None, "creeping_elevation")}},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.02, "trend": -0.003},
        "dsp": {"base": 24.0, "noise": 0.5, "trend": 0.2},
    },
    "menstrual_phases": [],
    "clinical_brief": {
        "primary_concern": "Morning Joint Stiffness",
        "clinical_intake": "Patient describes worsening morning joint stiffness in knees and fingers over the past month, with known history of psoriasis.",
        "summary": "Progressive walking asymmetry creeping from 2% to 7.5% over 6 months reveals silent joint deterioration — a pattern that precedes radiographic damage by 12-18 months. Combined with acute sleep fragmentation (4-5x baseline), the data indicates an active inflammatory arthropathy in a patient with known psoriasis.",
        "key_symptoms": ["Morning joint stiffness lasting >45 minutes in fingers and knees", "Progressive gait asymmetry worsening over 6 months", "Nocturnal pain causing 4-5 awakenings per night", "Dactylitis (sausage digit) reported in right index finger", "Fatigue disproportionate to activity level"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Rheumatology referral for CASPAR criteria evaluation", "Inflammatory markers: CRP, ESR, and HLA-B27 typing", "X-ray hands/feet plus MRI of affected joints", "Dermatology co-management for psoriasis-PsA correlation"],
        "cited_sources": ["PMC8888888: Gait alterations in early Psoriatic Arthritis", "PMC5523901: Digital Biomarkers Preceding Radiographic Joint Damage", "PMC7712345: Sleep Disruption in Inflammatory Arthropathies"],
        "guiding_questions": ["Does the morning stiffness improve after you have been moving for 30-60 minutes?", "Have you noticed any nail changes — pitting, ridging, or separation from the nail bed?", "Has any single finger or toe become uniformly swollen (sausage-like)?", "Is your psoriasis currently flaring, and do joint symptoms correlate with skin flares?", "Have you experienced any lower back stiffness, especially in the early morning?"]
    },
    "deltas": [
        {"metric": "walkingAsymmetryPercentage", "acute_avg": 7.5, "longitudinal_avg": 4.5, "delta": 3.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 4, "longitudinal_avg": 1, "delta": 3, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.35, "longitudinal_avg": 0.05, "delta": 0.30, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None}
    ],
    "conditions": [
        {"condition": "Psoriatic Arthritis", "similarity_score": 0.88, "pmcid": "PMC8888888", "title": "Gait alterations in early Psoriatic Arthritis", "snippet": "Longitudinal creeping of walking asymmetry is a key digital biomarker for joint deterioration before radiographic evidence."},
        {"condition": "Rheumatoid Arthritis", "similarity_score": 0.71, "pmcid": "PMC5523901", "title": "Early RA vs PsA: Distinguishing Features", "snippet": "Symmetrical small joint involvement without dactylitis favors RA, while asymmetric presentation with enthesitis favors PsA."},
        {"condition": "Ankylosing Spondylitis", "similarity_score": 0.54, "pmcid": "PMC7712345", "title": "Axial Spondyloarthropathy Screening", "snippet": "Morning stiffness with inflammatory back pain pattern should prompt HLA-B27 testing in psoriasis patients."}
    ]
}

# PATIENT 5: Elijah Brooks - Sleep Apnea
elijah = {
    "name": "Elijah Brooks",
    "time": "14:00",
    "narrative": "Waking up gasping for air, chronic daytime fatigue, morning headaches.",
    "risk_profile": {"factors": [
        {"category": "Metabolic", "factor": "Elevated BMI (>30)", "description": "BMI 34.2 — strongest modifiable risk factor for obstructive sleep apnea.", "severity": "High", "weight": 80},
        {"category": "Respiratory", "factor": "Nocturnal Respiratory Instability", "description": "Respiratory rate spiking to 26-28 breaths/min during sleep — 73% above waking baseline.", "severity": "High", "weight": 85},
        {"category": "Neurological", "factor": "Chronic Sleep Deprivation", "description": "Averaging 12-18 awakenings per night, preventing restorative deep sleep for weeks.", "severity": "High", "weight": 78},
        {"category": "Cardiovascular", "factor": "Nocturnal Hypoxemia Risk", "description": "Sustained respiratory events increase risk of pulmonary hypertension and arrhythmia.", "severity": "Elevated", "weight": 65},
    ]},
    "acute_config": {
        "hrv": {"base": 35, "noise": 5},
        "rhr": {"base": 72, "noise": 3},
        "temp": {"base": 0.1, "noise": 0.1},
        "rr": {"base": 15, "noise": 1, "spikes": {2: (26, "massive_spike"), 4: (28, "massive_spike"), 6: (25, "massive_spike")}},
        "walk": {"base": 1.2, "noise": 0.2},
        "steps": {"base": 7000, "noise": 800},
        "sleep": {"base": 1, "noise": 1, "spikes": {1: (15, "extreme"), 3: (18, "extreme"), 5: (16, "extreme")}},
        "spo2": {"base": 91.0, "noise": 1.5, "spikes": {1: (88.2, "critical_drop"), 3: (87.5, "critical_drop"), 5: (89.0, "critical_drop")}},
        "step_len": {"base": 0.71, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 1.5, "trend": 0},
        "walk": {"base": 1.2, "noise": 0.1, "trend": 0},
        "spo2": {"base": 94.5, "noise": 1.0, "trend": -0.1},
        "step_len": {"base": 0.71, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": [],
    "clinical_brief": {
        "primary_concern": "Sleep Apnea & Fatigue",
        "clinical_intake": "Patient reports waking up gasping for air, severe unrefreshing sleep leading to chronic daytime fatigue, and morning headaches.",
        "summary": "Respiratory rate spikes to 26-28 breaths/min during sleep align precisely with extreme sleep fragmentation (12-18 awakenings/night) — a 300% increase over baseline. This pattern, combined with witnessed apneic episodes and morning headaches, constitutes a textbook severe OSA presentation detectable through wearable data alone.",
        "key_symptoms": ["Witnessed apneic episodes — gasping and choking during sleep", "Excessive daytime sleepiness despite 8+ hours in bed", "Morning headaches resolving within 1-2 hours of waking", "Nocturia (2-3 bathroom trips per night)", "Unrefreshing sleep with cognitive impairment during the day"],
        "severity_assessment": "High — Urgent",
        "recommended_actions": ["Urgent polysomnography (sleep study) — suspected AHI >30 events/hour", "Evaluate for CPAP titration based on study results", "Assess for nocturnal hypoxemia with overnight pulse oximetry", "Screen for secondary hypertension and metabolic syndrome"],
        "cited_sources": ["PMC9999999: Wearable detection of sleep apnea events", "PMC6543210: Respiratory Rate as Digital Biomarker for OSA Severity", "PMC8123456: Cardiovascular Consequences of Untreated Sleep Apnea"],
        "guiding_questions": ["Has a bed partner or family member witnessed you stop breathing or gasp during sleep?", "Do you frequently fall asleep during passive activities like watching TV or reading?", "How would you rate your daytime sleepiness on a scale of 1-10?", "Do you wake up with headaches that go away within an hour or two?", "Have you been told you have high blood pressure, and is it difficult to control with medication?"]
    },
    "deltas": [
        {"metric": "respiratoryRate", "acute_avg": 21, "longitudinal_avg": 15, "delta": 6, "unit": "breaths/min", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 12, "longitudinal_avg": 3, "delta": 9, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 30, "longitudinal_avg": 42, "delta": -12, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "restingHeartRate", "acute_avg": 75, "longitudinal_avg": 70, "delta": 5, "unit": "bpm", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None}
    ],
    "conditions": [
        {"condition": "Severe Obstructive Sleep Apnea", "similarity_score": 0.95, "pmcid": "PMC9999999", "title": "Wearable detection of sleep apnea events", "snippet": "Massive spikes in respiratory rate and awake segments are hallmark digital signs of OSA with estimated AHI >30."},
        {"condition": "Central Sleep Apnea", "similarity_score": 0.68, "pmcid": "PMC6543210", "title": "Central vs Obstructive Apnea: Respiratory Waveform Analysis", "snippet": "Central apnea events lack the obstructive effort pattern and may co-occur with OSA in complex cases."},
        {"condition": "Obesity Hypoventilation Syndrome", "similarity_score": 0.61, "pmcid": "PMC8123456", "title": "OHS Comorbidity with Sleep Apnea", "snippet": "Daytime hypercapnia and nocturnal respiratory failure in patients with BMI >30 may indicate OHS superimposed on OSA."}
    ]
}

# PATIENT 6: Priya Sharma - PCOS
priya = {
    "name": "Priya Sharma",
    "time": "15:30",
    "narrative": "Sudden weight fluctuations, irregular cycles, and sudden spikes in systemic inflammation.",
    "risk_profile": {"factors": [
        {"category": "Endocrine", "factor": "Insulin Resistance", "description": "Borderline HOMA-IR of 2.8 — subclinical metabolic dysfunction driving hormonal imbalance.", "severity": "High", "weight": 75},
        {"category": "Hormonal", "factor": "Anovulatory Cycles", "description": "Erratic wrist temperature lacking normal biphasic pattern confirms absent ovulation for 3+ months.", "severity": "High", "weight": 80},
        {"category": "Metabolic", "factor": "Unexplained Weight Fluctuations", "description": "8 lb weight swing in 6 weeks without dietary changes, consistent with hormonal fluid retention.", "severity": "Elevated", "weight": 60},
        {"category": "Inflammatory", "factor": "Chronic Low-Grade Inflammation", "description": "Depressed HRV baseline suggests sustained sympathetic activation from metabolic stress.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 25, "noise": 4, "spikes": {3: (20, "depressed"), 4: (18, "depressed")}},
        "rhr": {"base": 78, "noise": 4},
        "temp": {"base": 0.4, "noise": 0.8, "spikes": {1: (-0.5, "erratic"), 3: (1.2, "erratic"), 6: (-0.2, "erratic")}},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 1.4, "noise": 0.2},
        "steps": {"base": 8500, "noise": 1000},
        "sleep": {"base": 2, "noise": 1},
        "spo2": {"base": 97.8, "noise": 0.3},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 75, "noise": 2, "trend": 0},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Late_Follicular", "Anovulatory", "Anovulatory", "Anovulatory", "Late_Follicular"],
    "clinical_brief": {
        "primary_concern": "Weight Gain & Oligomenorrhea",
        "clinical_intake": "Patient presents with sudden 8lb weight fluctuation, irregular cycles skipping months, and signs of systemic inflammation.",
        "summary": "Wrist temperature data reveals complete absence of the normal biphasic ovulatory pattern — confirming chronic anovulation. Combined with HRV depressed 37% below baseline (indicating sustained sympathetic activation) and erratic temperature swings of \u00b11.2\u00b0C, the biometric profile strongly correlates with PCOS-driven hormonal and metabolic dysregulation.",
        "key_symptoms": ["Irregular menstrual cycles — ranging from 21 to 65 days apart", "Unexplained weight gain of 8 lbs in 6 weeks", "Persistent adult-onset acne along jawline and chin", "Thinning hair on scalp with excess facial hair growth (hirsutism)", "Chronic fatigue with afternoon energy crashes"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Endocrinology panel: free/total testosterone, DHEA-S, LH/FSH ratio, fasting insulin", "Pelvic ultrasound for ovarian morphology (follicle count)", "Fasting glucose and HbA1c to assess insulin resistance", "Consider metformin trial if HOMA-IR confirmed elevated"],
        "cited_sources": ["PMC1010101: Biphasic temperature loss in PCOS", "PMC7845632: Wearable Thermometry for Ovulation Detection", "PMC5512890: Metabolic Syndrome Overlap in PCOS"],
        "guiding_questions": ["Have you noticed increased hair growth on your face, chest, or abdomen?", "How long have your menstrual cycles been irregular, and what is the longest gap between periods?", "Have you experienced difficulty losing weight despite diet and exercise changes?", "Is there a family history of diabetes, PCOS, or metabolic syndrome?", "Have you been screened for prediabetes or insulin resistance previously?"]
    },
    "deltas": [
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.4, "longitudinal_avg": 0.0, "delta": 0.4, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 22, "longitudinal_avg": 35, "delta": -13, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 78, "longitudinal_avg": 72, "delta": 6, "unit": "bpm", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None}
    ],
    "conditions": [
        {"condition": "Polycystic Ovary Syndrome (PCOS)", "similarity_score": 0.87, "pmcid": "PMC1010101", "title": "Biphasic temperature loss in PCOS", "snippet": "Erratic sleeping wrist temperatures and lack of biphasic patterns indicate anovulatory cycles, a hallmark of PCOS."},
        {"condition": "Hypothalamic Amenorrhea", "similarity_score": 0.63, "pmcid": "PMC7845632", "title": "Functional vs Organic Anovulation", "snippet": "Stress-induced hypothalamic suppression can mimic PCOS thermometry patterns but lacks hyperandrogenic features."},
        {"condition": "Subclinical Hypothyroidism", "similarity_score": 0.55, "pmcid": "PMC5512890", "title": "Thyroid Dysfunction and Menstrual Irregularity", "snippet": "TSH elevation between 4-10 mIU/L can cause cycle irregularity and weight gain overlapping with PCOS presentation."}
    ]
}

# PATIENT 7: Zoe Johnson - Systemic Lupus Erythematosus (SLE)
zoe = {
    "name": "Zoe Johnson",
    "time": "09:00",
    "narrative": "Butterfly rash across cheeks, severe joint pain, profound fatigue lasting weeks. Hair loss noticed recently.",
    "risk_profile": {"factors": [
        {"category": "Immunological", "factor": "Systemic Autoimmune Activation", "description": "ANA-positive with anti-dsDNA antibodies detected in prior screening, classic lupus markers.", "severity": "High", "weight": 88},
        {"category": "Dermatological", "factor": "Malar Rash", "description": "Characteristic butterfly rash across both cheeks, worsening with sun exposure.", "severity": "High", "weight": 75},
        {"category": "Inflammatory", "factor": "Chronic Inflammatory Burden", "description": "HRV depressed 55% below age-matched norms, indicating sustained sympathetic overdrive from systemic inflammation.", "severity": "High", "weight": 80},
        {"category": "Hematological", "factor": "Cytopenias Risk", "description": "Fatigue disproportionate to activity may reflect lupus-related anemia or leukopenia.", "severity": "Elevated", "weight": 60},
    ]},
    "acute_config": {
        "hrv": {"base": 26, "noise": 3, "spikes": {3: (18, "crashed"), 4: (19, "crashed"), 5: (20, "crashed")}},
        "rhr": {"base": 88, "noise": 3, "spikes": {3: (95, "elevated"), 4: (93, "elevated")}},
        "temp": {"base": 0.5, "noise": 0.1, "spikes": {3: (0.9, "sustained_high"), 4: (1.0, "sustained_high"), 5: (0.85, "sustained_high")}},
        "rr": {"base": 16, "noise": 0.5, "spikes": {3: (19, "elevated")}},
        "walk": {"base": 2.0, "noise": 0.3, "spikes": {3: (4.5, "guarding_detected"), 4: (4.8, "guarding_detected")}},
        "steps": {"base": 5500, "noise": 400, "spikes": {3: (2200, "mobility_drop"), 4: (2000, "mobility_drop"), 5: (2500, "mobility_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {3: (5, "painsomnia"), 4: (6, "painsomnia")}},
        "spo2": {"base": 97.2, "noise": 0.3},
        "step_len": {"base": 0.66, "noise": 0.02, "spikes": {3: (0.58, "shortened_stride"), 4: (0.56, "shortened_stride")}},
        "dsp": {"base": 25.0, "noise": 0.5, "spikes": {3: (30.5, "guarding_gait"), 4: (31.0, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 82, "noise": 2, "trend": 0.2},
        "walk": {"base": 1.8, "noise": 0.2, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.01},
        "dsp": {"base": 24.0, "noise": 0.4},
    },
    "menstrual_phases": ["Luteal", "Luteal", "Luteal", "Luteal", "Menstrual", "Menstrual", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Malar Rash & Polyarthralgia",
        "clinical_intake": "Patient presents with butterfly rash across cheeks exacerbating with sun, severe joint pain, profound fatigue, and recent hair thinning.",
        "summary": "Patient presents with classic lupus flare: HRV crashed 55% below baseline over 3 consecutive days while wrist temperature sustained +0.9C deviation. RHR spiked to 95 bpm during the flare window, and step count collapsed 60% from baseline, confirming systemic inflammatory decompensation.",
        "key_symptoms": ["Butterfly malar rash worsening with UV exposure", "Polyarthralgia affecting hands, wrists, and knees", "Profound fatigue unrelieved by rest lasting 3+ weeks", "Recent hair thinning and scalp tenderness", "Photosensitivity with skin lesion flares"],
        "severity_assessment": "High",
        "recommended_actions": ["Stat ANA panel with anti-dsDNA, anti-Smith, complement C3/C4", "CBC with differential to assess for cytopenias", "Urinalysis with protein/creatinine ratio for lupus nephritis screening", "Rheumatology referral for SLEDAI scoring and treatment initiation"],
        "cited_sources": ["PMC8321456: Digital Biomarkers of Lupus Flare Activity", "PMC6789012: HRV Depression in Systemic Autoimmune Disease", "PMC5234567: Wearable Thermometry for Inflammatory Flare Detection"],
        "guiding_questions": ["Does the rash worsen after sun exposure or appear spontaneously?", "Have you noticed any oral ulcers or mouth sores?", "Is there any swelling in your ankles or puffiness around your eyes in the morning?", "Have you experienced any chest pain or shortness of breath when breathing deeply?", "Is there a family history of lupus or other autoimmune conditions?"]
    },
    "deltas": [
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 20, "longitudinal_avg": 38, "delta": -18, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 92, "longitudinal_avg": 84, "delta": 8, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.82, "longitudinal_avg": 0.15, "delta": 0.67, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "stepCount", "acute_avg": 2233, "longitudinal_avg": 5500, "delta": -3267, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Systemic Lupus Erythematosus Flare", "similarity_score": 0.91, "pmcid": "PMC8321456", "title": "Digital Biomarkers of Lupus Flare Activity", "snippet": "Concurrent HRV crash, temperature elevation, and mobility collapse form a characteristic digital signature of active SLE flare."},
        {"condition": "Mixed Connective Tissue Disease", "similarity_score": 0.72, "pmcid": "PMC6789012", "title": "MCTD vs SLE: Overlapping Biometric Patterns", "snippet": "Overlapping features of lupus, scleroderma, and myositis can present with similar inflammatory biometric signatures."},
        {"condition": "Adult-Onset Still's Disease", "similarity_score": 0.58, "pmcid": "PMC5234567", "title": "Febrile Inflammatory Syndromes in Young Women", "snippet": "Quotidian fevers with rash and polyarthralgia should prompt Still's disease evaluation when ANA is negative."}
    ]
}

# PATIENT 8: Aaliyah Washington - Sickle Cell Disease
aaliyah = {
    "name": "Aaliyah Washington",
    "time": "10:00",
    "narrative": "Vaso-occlusive pain crisis episodes, extreme fatigue, sharp chest pain during crises. Emergency visits dismissed as drug-seeking.",
    "risk_profile": {"factors": [
        {"category": "Hematological", "factor": "Hemoglobin SS Genotype", "description": "Homozygous sickle cell disease confirmed at birth, baseline hemoglobin 7-8 g/dL.", "severity": "High", "weight": 95},
        {"category": "Cardiovascular", "factor": "Chronic Hemolytic Anemia", "description": "Compensatory tachycardia with RHR sustained 85-100 bpm due to chronic anemia.", "severity": "High", "weight": 85},
        {"category": "Respiratory", "factor": "Acute Chest Syndrome Risk", "description": "Chest pain during crises raises concern for pulmonary vaso-occlusion.", "severity": "High", "weight": 90},
        {"category": "Behavioral", "factor": "Pain Stigma History", "description": "Multiple ER visits documented as drug-seeking, delaying appropriate crisis management.", "severity": "Elevated", "weight": 70},
    ]},
    "acute_config": {
        "hrv": {"base": 22, "noise": 3, "spikes": {3: (12, "crisis_crash"), 4: (10, "crisis_crash"), 5: (14, "crisis_crash")}},
        "rhr": {"base": 90, "noise": 4, "spikes": {3: (108, "crisis_spike"), 4: (112, "crisis_spike"), 5: (105, "crisis_spike")}},
        "temp": {"base": 0.3, "noise": 0.15, "spikes": {3: (0.7, "crisis_fever"), 4: (0.8, "crisis_fever")}},
        "rr": {"base": 17, "noise": 0.5, "spikes": {3: (22, "elevated"), 4: (24, "elevated")}},
        "walk": {"base": 2.5, "noise": 0.3, "spikes": {3: (6.0, "guarding_detected"), 4: (6.5, "guarding_detected")}},
        "steps": {"base": 4000, "noise": 500, "spikes": {3: (800, "mobility_drop"), 4: (600, "mobility_drop"), 5: (1200, "mobility_drop")}},
        "sleep": {"base": 3, "noise": 1, "spikes": {3: (7, "painsomnia"), 4: (8, "painsomnia"), 5: (6, "painsomnia")}},
        "spo2": {"base": 93.0, "noise": 1.0, "spikes": {3: (89.0, "critical_drop"), 4: (88.5, "critical_drop"), 5: (90.0, "hypoxia_risk")}},
        "step_len": {"base": 0.60, "noise": 0.03, "spikes": {3: (0.48, "shortened_stride"), 4: (0.45, "shortened_stride")}},
        "dsp": {"base": 27.0, "noise": 0.6, "spikes": {3: (34.0, "guarding_gait"), 4: (35.5, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 88, "noise": 3, "trend": 0},
        "walk": {"base": 2.0, "noise": 0.2, "trend": 0},
        "spo2": {"base": 94.0, "noise": 0.8, "trend": -0.05},
        "step_len": {"base": 0.62, "noise": 0.02},
        "dsp": {"base": 26.0, "noise": 0.5},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Menstrual", "Menstrual", "Menstrual", "Follicular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Vaso-occlusive Pain Crisis",
        "clinical_intake": "Patient presents in acute distress with severe pain in chest, back, and extremities. Reports extreme fatigue and disrupted sleep.",
        "summary": "Biometric data captures a vaso-occlusive crisis in real time: SpO2 plummeted to 88.5% while RHR spiked to 112 bpm over days 3-5. HRV collapsed to 10ms — near-total autonomic shutdown consistent with severe pain crisis. Step count dropped 85% confirming immobilization from pain.",
        "key_symptoms": ["Severe vaso-occlusive pain in chest, back, and extremities", "SpO2 dropping below 90% during crisis episodes", "Extreme fatigue with baseline hemoglobin 7-8 g/dL", "Sleep completely fragmented by pain — 7-8 awakenings per night", "History of pain being dismissed as drug-seeking behavior"],
        "severity_assessment": "High — Urgent",
        "recommended_actions": ["Stat CBC with reticulocyte count and hemoglobin electrophoresis", "Chest X-ray to rule out acute chest syndrome", "Pain management protocol — multimodal approach avoiding stigma", "Hematology consult for hydroxyurea optimization or transfusion evaluation"],
        "cited_sources": ["PMC7654321: Wearable Monitoring of Sickle Cell Crises", "PMC8901234: SpO2 Patterns During Vaso-Occlusive Episodes", "PMC6345678: Racial Bias in Pain Management for Sickle Cell Disease"],
        "guiding_questions": ["How frequently are you experiencing pain crises — weekly, monthly, or less often?", "During your last ER visit, was your pain adequately managed, or were you sent home still in pain?", "Have you noticed the crises correlating with cold weather, dehydration, or stress?", "Are you currently on hydroxyurea, and has the dosage been optimized recently?", "Have you experienced any vision changes, priapism, or leg ulcers?"]
    },
    "deltas": [
        {"metric": "bloodOxygenSaturation", "acute_avg": 89.2, "longitudinal_avg": 94.0, "delta": -4.8, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 108, "longitudinal_avg": 88, "delta": 20, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 12, "longitudinal_avg": 28, "delta": -16, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "stepCount", "acute_avg": 867, "longitudinal_avg": 4000, "delta": -3133, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Sickle Cell Vaso-Occlusive Crisis", "similarity_score": 0.94, "pmcid": "PMC7654321", "title": "Wearable Monitoring of Sickle Cell Crises", "snippet": "Simultaneous SpO2 crash below 90%, RHR spike above 100 bpm, and HRV collapse form the digital triad of active VOC."},
        {"condition": "Acute Chest Syndrome", "similarity_score": 0.78, "pmcid": "PMC8901234", "title": "ACS in Sickle Cell: Early Detection via Wearables", "snippet": "Chest pain with SpO2 below 90% and elevated respiratory rate mandates urgent evaluation for acute chest syndrome."},
        {"condition": "Pulmonary Embolism", "similarity_score": 0.55, "pmcid": "PMC6345678", "title": "Thrombotic Risk in Sickle Cell Disease", "snippet": "Hypercoagulable state in SCD increases PE risk; acute SpO2 drops warrant CT angiography consideration."}
    ]
}

# PATIENT 9: Fatima Al-Hassan - Type 2 Diabetes + Neuropathy
fatima = {
    "name": "Fatima Al-Hassan",
    "time": "11:00",
    "narrative": "Numbness and tingling in hands and feet worsening over months, persistent fatigue, blurry vision after meals.",
    "risk_profile": {"factors": [
        {"category": "Metabolic", "factor": "Uncontrolled Hyperglycemia", "description": "Self-reported elevated fasting glucose with HbA1c unknown — likely above target for years.", "severity": "High", "weight": 82},
        {"category": "Neurological", "factor": "Peripheral Neuropathy Progression", "description": "Numbness progressing from toes to mid-foot over 6 months, classic stocking-glove pattern.", "severity": "High", "weight": 78},
        {"category": "Cardiovascular", "factor": "Autonomic Neuropathy Risk", "description": "Depressed HRV and shortened step length suggest early autonomic and motor nerve involvement.", "severity": "Elevated", "weight": 68},
        {"category": "Ophthalmological", "factor": "Diabetic Retinopathy Risk", "description": "Postprandial vision blurring suggests osmotic lens changes from glucose fluctuations.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 32, "noise": 3, "trend": -0.5},
        "rhr": {"base": 78, "noise": 2, "spikes": {4: (84, "elevated"), 5: (82, "elevated")}},
        "temp": {"base": 0.2, "noise": 0.1},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 1.8, "noise": 0.3},
        "steps": {"base": 5200, "noise": 400, "trend": -100},
        "sleep": {"base": 2, "noise": 1, "spikes": {3: (4, "nocturia"), 5: (4, "nocturia")}},
        "spo2": {"base": 95.5, "noise": 0.4},
        "step_len": {"base": 0.60, "noise": 0.02, "spikes": {4: (0.54, "shortened_stride"), 5: (0.53, "shortened_stride"), 6: (0.55, "shortened_stride")}},
        "dsp": {"base": 26.5, "noise": 0.5, "spikes": {4: (30.0, "instability_detected"), 5: (30.5, "instability_detected")}},
    },
    "long_config": {
        "rhr": {"base": 74, "noise": 1.5, "trend": 0.15},
        "walk": {"base": 1.5, "noise": 0.15, "trend": 0},
        "spo2": {"base": 96.0, "noise": 0.3, "trend": -0.02},
        "step_len": {"base": 0.65, "noise": 0.02, "trend": -0.002},
        "dsp": {"base": 25.0, "noise": 0.4, "trend": 0.06},
    },
    "menstrual_phases": ["Irregular", "Irregular", "Anovulatory", "Anovulatory", "Irregular", "Irregular", "Irregular"],
    "clinical_brief": {
        "primary_concern": "Peripheral Neuropathy Progression",
        "clinical_intake": "Patient reports progressive bilateral numbness in hands and feet, persistent fatigue, and postprandial blurred vision.",
        "summary": "Progressive peripheral neuropathy signature: step length declining from 0.65m to 0.54m over 6 months with double support percentage rising 22%. HRV shows steady downward trend confirming autonomic neuropathy. Postprandial vision changes suggest poor glycemic control with osmotic lens effects.",
        "key_symptoms": ["Bilateral numbness and tingling in stocking-glove distribution", "Progressive fatigue worsening over 6 months", "Blurry vision after meals resolving within 1-2 hours", "Nocturia — waking 2-3 times nightly to urinate", "Shortened stride with increasing gait instability"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Stat HbA1c and fasting glucose with insulin levels", "Nerve conduction study for peripheral neuropathy staging", "Comprehensive diabetic eye exam with dilated fundoscopy", "Podiatry referral for neuropathic foot risk assessment"],
        "cited_sources": ["PMC7123456: Gait Biomarkers of Diabetic Neuropathy", "PMC8234567: Wearable HRV as Autonomic Neuropathy Marker", "PMC6012345: Step Length Decline in Diabetic Peripheral Neuropathy"],
        "guiding_questions": ["When did you first notice the numbness, and has it been spreading upward?", "Do you check your blood sugar at home, and what are typical readings?", "Have you noticed any wounds on your feet that were slow to heal?", "Is the vision blurriness constant or does it come and go with meals?", "Do you experience burning or shooting pain in your feet, especially at night?"]
    },
    "deltas": [
        {"metric": "walkingStepLength", "acute_avg": 0.55, "longitudinal_avg": 0.65, "delta": -0.10, "unit": "meters", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "down"},
        {"metric": "walkingDoubleSupportPercentage", "acute_avg": 30.2, "longitudinal_avg": 25.0, "delta": 5.2, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 29, "longitudinal_avg": 36, "delta": -7, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Diabetic Peripheral Neuropathy", "similarity_score": 0.90, "pmcid": "PMC7123456", "title": "Gait Biomarkers of Diabetic Neuropathy", "snippet": "Progressive step length shortening combined with increased double support percentage is a reliable early marker of diabetic peripheral neuropathy."},
        {"condition": "Diabetic Autonomic Neuropathy", "similarity_score": 0.76, "pmcid": "PMC8234567", "title": "HRV Trends in Diabetic Autonomic Dysfunction", "snippet": "Steady HRV decline over months without acute triggers indicates subclinical cardiac autonomic neuropathy."},
        {"condition": "Vitamin B12 Deficiency Neuropathy", "similarity_score": 0.58, "pmcid": "PMC6012345", "title": "Metabolic Neuropathies: Differential Diagnosis", "snippet": "B12 deficiency can mimic diabetic neuropathy presentation and should be excluded with serum levels."}
    ]
}

# PATIENT 10: Naomi Clarke - Hypothyroidism
naomi = {
    "name": "Naomi Clarke",
    "time": "13:00",
    "narrative": "Extreme fatigue despite sleeping 10+ hours, unexplained weight gain of 15 pounds, brain fog, cold intolerance.",
    "risk_profile": {"factors": [
        {"category": "Endocrine", "factor": "Suspected Hypothyroidism", "description": "Constellation of fatigue, weight gain, cold intolerance, and bradycardia highly suggestive of thyroid deficiency.", "severity": "High", "weight": 85},
        {"category": "Cardiovascular", "factor": "Bradycardia", "description": "Resting heart rate consistently 55-60 bpm — below normal range, consistent with thyroid-mediated metabolic slowing.", "severity": "Elevated", "weight": 70},
        {"category": "Neurological", "factor": "Cognitive Dysfunction", "description": "Self-reported brain fog, difficulty concentrating, and slowed speech processing.", "severity": "Moderate", "weight": 55},
        {"category": "Metabolic", "factor": "Unexplained Weight Gain", "description": "15-pound gain over 3 months without dietary changes, suggesting metabolic rate suppression.", "severity": "Moderate", "weight": 58},
    ]},
    "acute_config": {
        "hrv": {"base": 28, "noise": 3},
        "rhr": {"base": 57, "noise": 2, "spikes": {2: (54, "bradycardia"), 5: (53, "bradycardia")}},
        "temp": {"base": -0.15, "noise": 0.08},
        "rr": {"base": 13, "noise": 0.4},
        "walk": {"base": 1.3, "noise": 0.2},
        "steps": {"base": 4500, "noise": 500, "trend": -150},
        "sleep": {"base": 1, "noise": 0.5, "spikes": {3: (3, "hypersomnia_unrefreshing")}},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.02},
        "dsp": {"base": 23.5, "noise": 0.4, "spikes": {5: (26.0, "mildly_elevated")}},
    },
    "long_config": {
        "rhr": {"base": 60, "noise": 1.5, "trend": -0.15},
        "walk": {"base": 1.2, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.01, "trend": -0.001},
        "dsp": {"base": 23.0, "noise": 0.3},
    },
    "menstrual_phases": ["Luteal", "Luteal", "Luteal", "Luteal", "Menstrual", "Menstrual", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Extreme Fatigue & Weight Gain",
        "clinical_intake": "Patient reports crushing fatigue despite 10+ hours of sleep, unexplained 15-pound weight gain, brain fog, and cold intolerance.",
        "summary": "Bradycardia pattern with RHR at 53-57 bpm combined with persistently low wrist temperature deviation (-0.15C) indicates metabolic slowing consistent with hypothyroidism. Step count declining 150 steps/day over the acute window reflects progressive exercise intolerance from fatigue.",
        "key_symptoms": ["Extreme fatigue despite 10+ hours of sleep", "Unexplained weight gain of 15 pounds over 3 months", "Cold intolerance — wearing layers indoors", "Brain fog with difficulty concentrating at work", "Constipation and dry skin worsening over weeks"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Stat TSH and free T4 levels", "Lipid panel — hypothyroidism frequently causes dyslipidemia", "Anti-TPO antibodies to evaluate for Hashimoto's thyroiditis", "Initiate levothyroxine if TSH confirmed elevated"],
        "cited_sources": ["PMC8456789: Wearable Bradycardia Patterns in Hypothyroidism", "PMC7345678: Thermometric Signatures of Thyroid Dysfunction", "PMC6234890: Digital Biomarkers for Metabolic Endocrine Disorders"],
        "guiding_questions": ["Have you noticed your skin becoming unusually dry or your hair becoming brittle?", "Is the fatigue constant or does it worsen at particular times of day?", "Have you experienced any menstrual irregularities — heavier or more prolonged periods?", "Is there a family history of thyroid disease or autoimmune conditions?", "Have you had your thyroid function tested before, and when was the last time?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 55, "longitudinal_avg": 60, "delta": -5, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 26, "longitudinal_avg": 34, "delta": -8, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "stepCount", "acute_avg": 3800, "longitudinal_avg": 5200, "delta": -1400, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Primary Hypothyroidism (Hashimoto's)", "similarity_score": 0.91, "pmcid": "PMC8456789", "title": "Wearable Bradycardia Patterns in Hypothyroidism", "snippet": "Sustained bradycardia below 58 bpm with declining step counts and low wrist temperature are hallmark wearable findings in undiagnosed hypothyroidism."},
        {"condition": "Subclinical Hypothyroidism", "similarity_score": 0.74, "pmcid": "PMC7345678", "title": "Subclinical vs Overt Thyroid Deficiency", "snippet": "Patients with TSH 5-10 may present with fatigue and weight gain before frank bradycardia develops."},
        {"condition": "Chronic Fatigue Syndrome", "similarity_score": 0.55, "pmcid": "PMC6234890", "title": "CFS vs Endocrine Fatigue: Differential Approach", "snippet": "CFS lacks the metabolic slowing pattern — normal or elevated RHR distinguishes it from hypothyroid fatigue."}
    ]
}

# PATIENT 11: Sofia Rivera - Interstitial Cystitis
sofia = {
    "name": "Sofia Rivera",
    "time": "14:00",
    "narrative": "Chronic pelvic pain and burning, urinary urgency every 30 minutes, sleep completely disrupted by bathroom trips.",
    "risk_profile": {"factors": [
        {"category": "Urological", "factor": "Chronic Bladder Pain", "description": "Persistent suprapubic pain and pressure with urinary frequency exceeding 20 voids/day.", "severity": "High", "weight": 80},
        {"category": "Musculoskeletal", "factor": "Pelvic Floor Dysfunction", "description": "Elevated walking asymmetry and double support percentage suggest compensatory pelvic guarding.", "severity": "Elevated", "weight": 68},
        {"category": "Neurological", "factor": "Central Sensitization", "description": "Pain response disproportionate to bladder filling — consistent with central pain amplification.", "severity": "Elevated", "weight": 65},
        {"category": "Behavioral", "factor": "Severe Sleep Disruption", "description": "Nocturia causing 5-6 awakenings nightly, resulting in chronic sleep deprivation.", "severity": "Moderate", "weight": 58},
    ]},
    "acute_config": {
        "hrv": {"base": 35, "noise": 4, "spikes": {3: (25, "pain_response"), 4: (24, "pain_response")}},
        "rhr": {"base": 72, "noise": 3},
        "temp": {"base": 0.15, "noise": 0.1},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 2.5, "noise": 0.3, "spikes": {3: (5.0, "guarding_detected"), 4: (5.5, "guarding_detected"), 5: (4.8, "guarding_detected")}},
        "steps": {"base": 6000, "noise": 500, "spikes": {3: (3500, "mobility_drop"), 4: (3200, "mobility_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {2: (5, "nocturia"), 3: (6, "nocturia"), 4: (6, "nocturia"), 5: (5, "nocturia")}},
        "spo2": {"base": 97.5, "noise": 0.3},
        "step_len": {"base": 0.66, "noise": 0.02, "spikes": {3: (0.58, "shortened_stride"), 4: (0.57, "shortened_stride")}},
        "dsp": {"base": 25.5, "noise": 0.5, "spikes": {3: (30.0, "guarding_gait"), 4: (31.0, "guarding_gait"), 5: (29.0, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 68, "noise": 1.5, "trend": 0},
        "walk": {"base": 2.0, "noise": 0.15, "trend": 0.02},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.01, "trend": -0.001},
        "dsp": {"base": 24.5, "noise": 0.4, "trend": 0.04},
    },
    "menstrual_phases": ["Luteal", "Luteal", "Luteal", "Menstrual", "Menstrual", "Menstrual", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Chronic Suprapubic Pain",
        "clinical_intake": "Patient reports chronic pelvic pain and burning, severe urinary urgency every 30 minutes, and massive sleep disruption.",
        "summary": "Pelvic guarding signature with walking asymmetry spiking to 5.5% and double support percentage reaching 31%. Sleep fragmentation severe at 5-6 awakenings from nocturia. HRV dropped 30% during pain flare days, confirming autonomic stress response to chronic bladder pain.",
        "key_symptoms": ["Chronic suprapubic pain and burning sensation", "Urinary frequency exceeding 20 voids per day", "Nocturia causing 5-6 awakenings per night", "Pelvic floor guarding affecting gait mechanics", "Pain worsening with bladder filling and menstruation"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Urology referral for cystoscopy with hydrodistension", "Voiding diary for 72 hours to quantify frequency and volumes", "Pelvic floor physical therapy evaluation", "Trial of pentosan polysulfate or intravesical therapy"],
        "cited_sources": ["PMC8567890: Digital Gait Markers in Pelvic Pain Syndromes", "PMC7456789: Sleep Disruption Patterns in Interstitial Cystitis", "PMC6345012: Wearable Assessment of Pelvic Floor Dysfunction"],
        "guiding_questions": ["Does the pain improve or worsen after urination?", "Have you identified any dietary triggers — coffee, alcohol, acidic foods?", "Is the urgency accompanied by incontinence episodes?", "Does the pain intensify during the premenstrual or menstrual phase?", "Have you been evaluated for endometriosis or vulvodynia as comorbid conditions?"]
    },
    "deltas": [
        {"metric": "walkingAsymmetryPercentage", "acute_avg": 4.8, "longitudinal_avg": 2.2, "delta": 2.6, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "walkingDoubleSupportPercentage", "acute_avg": 29.5, "longitudinal_avg": 24.5, "delta": 5.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 5.4, "longitudinal_avg": 2.0, "delta": 3.4, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Interstitial Cystitis / Bladder Pain Syndrome", "similarity_score": 0.88, "pmcid": "PMC8567890", "title": "Digital Gait Markers in Pelvic Pain Syndromes", "snippet": "Elevated walking asymmetry with double support increase indicates compensatory pelvic guarding from chronic bladder pain."},
        {"condition": "Overactive Bladder Syndrome", "similarity_score": 0.70, "pmcid": "PMC7456789", "title": "OAB vs IC: Distinguishing Nocturia Patterns", "snippet": "OAB nocturia typically involves urgency without pain, distinguishing it from the painful bladder filling of IC."},
        {"condition": "Pelvic Floor Myofascial Pain", "similarity_score": 0.60, "pmcid": "PMC6345012", "title": "Myofascial Pelvic Pain: Gait Analysis", "snippet": "Primary pelvic floor myofascial dysfunction produces similar gait guarding patterns but lacks urinary frequency."}
    ]
}

# PATIENT 12: Kezia Okafor - Endometriosis Stage III (Sciatic)
kezia = {
    "name": "Kezia Okafor",
    "time": "15:00",
    "narrative": "Severe radiating pain from pelvis down both legs, painful bowel movements, years of infertility. Multiple doctors said it's just bad periods.",
    "risk_profile": {"factors": [
        {"category": "Reproductive", "factor": "Deep-Infiltrating Endometriosis", "description": "Sciatic nerve involvement with bilateral leg pain suggests deep infiltration into uterosacral ligaments.", "severity": "High", "weight": 90},
        {"category": "Gastrointestinal", "factor": "Bowel Endometriosis", "description": "Painful bowel movements correlating with menstrual cycle indicate rectovaginal endometriosis.", "severity": "High", "weight": 82},
        {"category": "Musculoskeletal", "factor": "Severe Gait Impairment", "description": "Walking asymmetry at 10%+ indicates significant guarding from sciatic nerve irritation.", "severity": "High", "weight": 85},
        {"category": "Behavioral", "factor": "Diagnostic Delay", "description": "10+ year history of dismissed symptoms across 6 providers, Black women average 11-year delay.", "severity": "Elevated", "weight": 72},
    ]},
    "acute_config": {
        "hrv": {"base": 30, "noise": 3, "spikes": {3: (15, "crashed"), 4: (13, "crashed"), 5: (16, "crashed")}},
        "rhr": {"base": 74, "noise": 3, "spikes": {3: (82, "elevated"), 4: (85, "elevated")}},
        "temp": {"base": 0.3, "noise": 0.1, "spikes": {3: (1.0, "sustained_high"), 4: (1.1, "sustained_high"), 5: (0.9, "sustained_high")}},
        "rr": {"base": 15, "noise": 0.5, "spikes": {3: (19, "elevated"), 4: (20, "elevated")}},
        "walk": {"base": 3.0, "noise": 0.4, "spikes": {3: (10.5, "guarding_detected"), 4: (11.0, "guarding_detected"), 5: (9.8, "guarding_detected")}},
        "steps": {"base": 5000, "noise": 500, "spikes": {3: (1000, "mobility_drop"), 4: (800, "mobility_drop"), 5: (1300, "mobility_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {3: (6, "painsomnia"), 4: (7, "painsomnia"), 5: (6, "painsomnia")}},
        "spo2": {"base": 97.5, "noise": 0.3},
        "step_len": {"base": 0.62, "noise": 0.03, "spikes": {3: (0.45, "shortened_stride"), 4: (0.42, "shortened_stride"), 5: (0.48, "shortened_stride")}},
        "dsp": {"base": 26.0, "noise": 0.6, "spikes": {3: (36.0, "guarding_gait"), 4: (38.0, "guarding_gait"), 5: (34.0, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 1.5, "trend": 0},
        "walk": {"base": 2.5, "noise": 0.2, "trend": 0.02},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.66, "noise": 0.02, "trend": -0.002},
        "dsp": {"base": 25.0, "noise": 0.5, "trend": 0.04},
    },
    "menstrual_phases": ["Menstrual", "Menstrual", "Menstrual", "Menstrual", "Menstrual", "Late_Menstrual", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Sciatic Endometriosis Flare",
        "clinical_intake": "Patient presents with severe radiating pain from pelvis down both legs, painful bowel movements, and a history of infertility.",
        "summary": "Extreme gait impairment with walking asymmetry reaching 11% and double support at 38% — the highest pelvic guarding signature in the cohort. HRV crashed to 13ms during menstrual peak while step length shortened to 0.42m. Pattern is pathognomonic for deep-infiltrating endometriosis with sciatic nerve involvement.",
        "key_symptoms": ["Severe bilateral leg pain radiating from pelvis — sciatic pattern", "Dyschezia — painful bowel movements during menstruation", "Walking asymmetry exceeding 10% during flare", "Complete mobility collapse — step count dropping 84% from baseline", "10-year diagnostic odyssey across 6 providers"],
        "severity_assessment": "High",
        "recommended_actions": ["MRI pelvis with rectal protocol for deep infiltrating endometriosis mapping", "Refer to endometriosis specialist — not general OB/GYN", "Neurological assessment for sciatic nerve entrapment", "Multidisciplinary pain management plan including pelvic floor PT"],
        "cited_sources": ["PMC9123456: Sciatic Endometriosis: A Missed Diagnosis", "PMC8234890: Gait Analysis in Deep-Infiltrating Endometriosis", "PMC7012345: Racial Disparities in Endometriosis Diagnosis"],
        "guiding_questions": ["Does the leg pain follow a consistent pattern with your menstrual cycle?", "Have you experienced pain during or after sexual intercourse?", "Do bowel symptoms worsen specifically during your period?", "How many healthcare providers have you seen for these symptoms before today?", "Have you been trying to conceive, and for how long?"]
    },
    "deltas": [
        {"metric": "walkingAsymmetryPercentage", "acute_avg": 10.1, "longitudinal_avg": 2.8, "delta": 7.3, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 15, "longitudinal_avg": 38, "delta": -23, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "walkingStepLength", "acute_avg": 0.45, "longitudinal_avg": 0.66, "delta": -0.21, "unit": "meters", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "walkingDoubleSupportPercentage", "acute_avg": 36.0, "longitudinal_avg": 25.0, "delta": 11.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Deep-Infiltrating Endometriosis with Sciatic Involvement", "similarity_score": 0.93, "pmcid": "PMC9123456", "title": "Sciatic Endometriosis: A Missed Diagnosis", "snippet": "Bilateral leg pain with menstrual cycling and extreme walking asymmetry is pathognomonic for deep endometriosis infiltrating the sciatic nerve."},
        {"condition": "Rectovaginal Endometriosis", "similarity_score": 0.81, "pmcid": "PMC8234890", "title": "Bowel Endometriosis: Clinical and Digital Markers", "snippet": "Dyschezia correlating with menstrual phase combined with pelvic guarding suggests rectovaginal endometriosis nodules."},
        {"condition": "Piriformis Syndrome", "similarity_score": 0.52, "pmcid": "PMC7012345", "title": "Piriformis vs Endometriotic Sciatica", "snippet": "Non-cyclical piriformis syndrome lacks menstrual correlation and shows different gait compensation patterns."}
    ]
}

# PATIENT 13: Renata Ferreira - Chronic Migraine with Aura
renata = {
    "name": "Renata Ferreira",
    "time": "08:00",
    "narrative": "Debilitating headaches 15+ days per month with visual aura, light sensitivity, nausea. Cannot work during attacks.",
    "risk_profile": {"factors": [
        {"category": "Neurological", "factor": "Chronic Migraine Classification", "description": "15+ headache days/month for 3+ months meets ICHD-3 chronic migraine criteria.", "severity": "High", "weight": 82},
        {"category": "Autonomic", "factor": "Attack-Day Autonomic Disruption", "description": "RHR spikes and HRV crashes specifically on attack days reveal migraine-triggered autonomic dysfunction.", "severity": "High", "weight": 78},
        {"category": "Functional", "factor": "Severe Disability", "description": "Complete activity cessation during attacks — step count drops to near zero.", "severity": "Elevated", "weight": 70},
        {"category": "Hormonal", "factor": "Menstrual Trigger", "description": "Attacks cluster around menstruation, suggesting estrogen withdrawal as primary trigger.", "severity": "Moderate", "weight": 60},
    ]},
    "acute_config": {
        "hrv": {"base": 42, "noise": 3, "spikes": {2: (22, "attack_crash"), 3: (18, "attack_crash"), 5: (20, "attack_crash")}},
        "rhr": {"base": 68, "noise": 2, "spikes": {2: (82, "attack_spike"), 3: (85, "attack_spike"), 5: (80, "attack_spike")}},
        "temp": {"base": 0.0, "noise": 0.1, "spikes": {2: (0.5, "attack_elevation"), 3: (0.6, "attack_elevation")}},
        "rr": {"base": 14, "noise": 0.5, "spikes": {3: (18, "elevated")}},
        "walk": {"base": 1.2, "noise": 0.2},
        "steps": {"base": 7500, "noise": 500, "spikes": {2: (1500, "mobility_drop"), 3: (800, "mobility_drop"), 5: (2000, "mobility_drop")}},
        "sleep": {"base": 1, "noise": 1, "spikes": {2: (4, "attack_insomnia"), 3: (5, "attack_insomnia"), 5: (4, "attack_insomnia")}},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.0, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 66, "noise": 1.5, "trend": 0},
        "walk": {"base": 1.1, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.01},
        "dsp": {"base": 22.0, "noise": 0.3},
    },
    "menstrual_phases": ["Menstrual", "Menstrual", "Late_Menstrual", "Follicular", "Follicular", "Follicular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Chronic Menstrual Migraines",
        "clinical_intake": "Patient experiences debilitating headaches 15+ days a month with visual aura, photophobia, and nausea, causing severe disability.",
        "summary": "Clear attack-day biometric signature: HRV crashes from 42ms baseline to 18ms on attack days while RHR spikes to 85 bpm. Step count collapses 89% on worst attack day. Pattern repeats 3 times in 7 days, correlating with menstrual onset — confirming menstrual migraine phenotype.",
        "key_symptoms": ["Debilitating headache 15+ days per month", "Visual aura preceding attacks — scotomas and zigzag lines", "Severe photophobia and phonophobia during attacks", "Nausea and vomiting preventing oral medication tolerance", "Complete functional disability during attack days"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Neurology referral for chronic migraine preventive therapy evaluation", "CGRP inhibitor trial (erenumab, galcanezumab)", "Headache diary correlated with menstrual cycle tracking", "MRI brain with and without contrast to exclude secondary causes"],
        "cited_sources": ["PMC8912345: Wearable Detection of Migraine Attack Onset", "PMC7823456: Autonomic Biomarkers in Chronic Migraine", "PMC6712345: Menstrual Migraine: Hormonal Triggers and Management"],
        "guiding_questions": ["Do you experience any warning signs before the headache starts — visual disturbances, tingling?", "Have you noticed the headaches clustering around the start of your period?", "How many acute medications (triptans, NSAIDs) do you use per month?", "Have you tried any preventive medications, and what was the outcome?", "Is there a family history of migraine or other headache disorders?"]
    },
    "deltas": [
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 28, "longitudinal_avg": 44, "delta": -16, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 78, "longitudinal_avg": 66, "delta": 12, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "stepCount", "acute_avg": 3500, "longitudinal_avg": 7500, "delta": -4000, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Chronic Migraine with Aura (Menstrual Type)", "similarity_score": 0.92, "pmcid": "PMC8912345", "title": "Wearable Detection of Migraine Attack Onset", "snippet": "Attack-day HRV crash with RHR spike and complete mobility cessation form a reproducible digital signature of migraine."},
        {"condition": "Medication Overuse Headache", "similarity_score": 0.68, "pmcid": "PMC7823456", "title": "MOH Complicating Chronic Migraine", "snippet": "Frequent acute medication use exceeding 10 days/month can transform episodic migraine into chronic daily headache."},
        {"condition": "Idiopathic Intracranial Hypertension", "similarity_score": 0.50, "pmcid": "PMC6712345", "title": "IIH vs Chronic Migraine: Diagnostic Pitfalls", "snippet": "Daily headache with visual disturbances requires fundoscopic examination to rule out papilledema."}
    ]
}

# PATIENT 14: Yasmin Hassan - Postpartum Depression + Anxiety
yasmin = {
    "name": "Yasmin Hassan",
    "time": "09:30",
    "narrative": "4 months postpartum. Cannot sleep even when baby sleeps, intrusive thoughts, racing heart, crying spells daily.",
    "risk_profile": {"factors": [
        {"category": "Psychiatric", "factor": "Postpartum Depression", "description": "PHQ-9 likely elevated with anhedonia, insomnia, and crying spells emerging 6 weeks postpartum.", "severity": "High", "weight": 85},
        {"category": "Autonomic", "factor": "Anxiety-Driven Tachycardia", "description": "Elevated RHR with low HRV pattern consistent with sustained sympathetic overdrive from anxiety.", "severity": "High", "weight": 75},
        {"category": "Neurological", "factor": "Severe Insomnia", "description": "Sleep fragmentation persists independently of infant care — 5-6 awakenings even when baby sleeps through.", "severity": "Elevated", "weight": 72},
        {"category": "Behavioral", "factor": "Intrusive Thought Patterns", "description": "Distressing intrusive thoughts about infant safety indicate anxiety component requiring immediate assessment.", "severity": "High", "weight": 80},
    ]},
    "acute_config": {
        "hrv": {"base": 30, "noise": 4, "spikes": {2: (20, "anxiety_dip"), 4: (18, "anxiety_dip"), 6: (22, "anxiety_dip")}},
        "rhr": {"base": 78, "noise": 3, "spikes": {2: (88, "anxiety_spike"), 4: (90, "anxiety_spike"), 6: (86, "anxiety_spike")}},
        "temp": {"base": 0.05, "noise": 0.1},
        "rr": {"base": 15, "noise": 0.5, "spikes": {2: (18, "elevated"), 4: (19, "elevated")}},
        "walk": {"base": 1.3, "noise": 0.2},
        "steps": {"base": 5500, "noise": 600},
        "sleep": {"base": 3, "noise": 1, "spikes": {0: (5, "fragmented"), 1: (6, "fragmented"), 2: (6, "fragmented"), 3: (5, "fragmented"), 4: (6, "fragmented"), 5: (5, "fragmented"), 6: (5, "fragmented")}},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.69, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 72, "noise": 2, "trend": 0.2},
        "walk": {"base": 1.2, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.01},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Postpartum", "Postpartum", "Postpartum", "Postpartum", "Postpartum", "Postpartum", "Postpartum"],
    "clinical_brief": {
        "primary_concern": "Postpartum Anxiety & Insomnia",
        "clinical_intake": "Four months postpartum patient reports severe insomnia, intrusive thoughts regarding infant safety, racing heart, and daily crying.",
        "summary": "Sustained sleep fragmentation across all 7 days (5-6 awakenings nightly independent of infant care) with episodic RHR spikes to 90 bpm and HRV dips to 18ms. The pattern of sympathetic overdrive without physical exertion is characteristic of postpartum anxiety-depression comorbidity.",
        "key_symptoms": ["Inability to sleep even when infant sleeps through the night", "Intrusive distressing thoughts about infant safety", "Daily crying spells lasting 30+ minutes", "Episodic racing heart without physical trigger", "Anhedonia — loss of interest in activities previously enjoyed"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Edinburgh Postnatal Depression Scale (EPDS) administration — score likely >13", "Psychiatric evaluation for postpartum depression with anxiety features", "Screen for postpartum psychosis risk factors given intrusive thoughts", "Consider SSRI therapy safe for breastfeeding (sertraline first-line)"],
        "cited_sources": ["PMC8345678: Wearable Sleep Markers in Postpartum Depression", "PMC7234567: HRV Patterns in Perinatal Anxiety Disorders", "PMC6123890: Autonomic Correlates of Postpartum Mood Disorders"],
        "guiding_questions": ["Are the intrusive thoughts about your baby causing you significant distress?", "Do you feel bonded with your baby, or has bonding felt difficult?", "Were you diagnosed with depression or anxiety before or during pregnancy?", "Are you currently breastfeeding, and would that influence medication decisions?", "Do you have adequate support at home — partner, family, postpartum doula?"]
    },
    "deltas": [
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 5.6, "longitudinal_avg": 2.5, "delta": 3.1, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
        {"metric": "restingHeartRate", "acute_avg": 84, "longitudinal_avg": 74, "delta": 10, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 22, "longitudinal_avg": 35, "delta": -13, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Postpartum Depression with Anxiety", "similarity_score": 0.90, "pmcid": "PMC8345678", "title": "Wearable Sleep Markers in Postpartum Depression", "snippet": "Persistent sleep fragmentation independent of infant waking combined with autonomic hyperarousal is a digital hallmark of PPD with anxiety."},
        {"condition": "Postpartum Thyroiditis", "similarity_score": 0.65, "pmcid": "PMC7234567", "title": "Thyroiditis Mimicking Postpartum Depression", "snippet": "Thyrotoxic phase of postpartum thyroiditis produces anxiety, tachycardia, and insomnia indistinguishable from PPD clinically."},
        {"condition": "Generalized Anxiety Disorder (Exacerbated)", "similarity_score": 0.58, "pmcid": "PMC6123890", "title": "Pre-existing Anxiety in the Postpartum Period", "snippet": "Baseline GAD may worsen postpartum due to hormonal shifts and sleep deprivation amplifying sympathetic tone."}
    ]
}

# PATIENT 15: Camille Dubois - Fibromyalgia
camille = {
    "name": "Camille Dubois",
    "time": "10:45",
    "narrative": "Widespread pain in all four quadrants, crushing fatigue, cannot sleep through the night. Pain moves around unpredictably.",
    "risk_profile": {"factors": [
        {"category": "Neurological", "factor": "Central Sensitization Syndrome", "description": "Widespread pain without focal source, consistent with central pain amplification and sensitized nociceptors.", "severity": "High", "weight": 80},
        {"category": "Sleep", "factor": "Non-Restorative Sleep", "description": "Chronic painsomnia with 4-5 awakenings per night preventing restorative deep sleep stages.", "severity": "High", "weight": 76},
        {"category": "Musculoskeletal", "factor": "Gait Compensation", "description": "Shortened stride length and elevated double support suggest pain-avoidant movement patterns.", "severity": "Elevated", "weight": 65},
        {"category": "Psychiatric", "factor": "Depression Comorbidity Risk", "description": "Chronic pain with sleep disruption increases depression risk 3-fold.", "severity": "Moderate", "weight": 58},
    ]},
    "acute_config": {
        "hrv": {"base": 28, "noise": 3, "spikes": {2: (22, "depressed"), 4: (20, "depressed"), 5: (21, "depressed")}},
        "rhr": {"base": 75, "noise": 2, "spikes": {4: (80, "elevated")}},
        "temp": {"base": 0.2, "noise": 0.1},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 2.0, "noise": 0.3, "spikes": {4: (3.8, "guarding_detected")}},
        "steps": {"base": 4500, "noise": 400, "spikes": {4: (2200, "mobility_drop"), 5: (2500, "mobility_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {1: (4, "painsomnia"), 2: (5, "painsomnia"), 3: (4, "painsomnia"), 4: (5, "painsomnia"), 5: (4, "painsomnia")}},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.63, "noise": 0.02, "spikes": {4: (0.55, "shortened_stride"), 5: (0.56, "shortened_stride")}},
        "dsp": {"base": 26.0, "noise": 0.5, "spikes": {4: (30.0, "guarding_gait"), 5: (29.5, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 72, "noise": 1.5, "trend": 0},
        "walk": {"base": 1.8, "noise": 0.15, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.65, "noise": 0.01, "trend": -0.001},
        "dsp": {"base": 25.0, "noise": 0.4},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Follicular", "Follicular", "Ovulatory", "Follicular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Widespread Pain & Painsomnia",
        "clinical_intake": "Patient reports unpredictable, widespread pain across all four body quadrants, crushing fatigue, and severe sleep fragmentation.",
        "summary": "Sustained sleep fragmentation across 5 of 7 days with 4-5 painsomnia awakenings nightly. HRV depressed 25% below baseline with intermittent crashes to 20ms. Step length shortened 15% during flare, and step count collapsed 50% — consistent with widespread fibromyalgia pain flare without focal pathology.",
        "key_symptoms": ["Widespread pain across all four body quadrants", "Non-restorative sleep with 4-5 awakenings nightly", "Migratory pain pattern — shifting between locations", "Cognitive dysfunction (fibro fog)", "Fatigue disproportionate to activity level"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Rheumatology evaluation using ACR 2016 fibromyalgia criteria", "Sleep study to exclude comorbid sleep apnea", "Trial of duloxetine or pregabalin for central sensitization", "Graded exercise therapy with pacing education"],
        "cited_sources": ["PMC8678901: Digital Phenotyping of Fibromyalgia Flares", "PMC7567890: Sleep Architecture Disruption in Fibromyalgia", "PMC6456789: Gait Biomarkers in Central Sensitization Syndromes"],
        "guiding_questions": ["Can you point to specific tender points, or does the pain feel diffuse and shifting?", "Does exercise make the pain better or worse — and is there a delayed worsening 24-48 hours later?", "How would you describe your sleep quality — do you wake feeling rested?", "Have you been evaluated for comorbid conditions like IBS, TMJ, or chronic headaches?", "Is there a history of trauma — physical or emotional — that preceded the onset of symptoms?"]
    },
    "deltas": [
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 4.4, "longitudinal_avg": 1.8, "delta": 2.6, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 23, "longitudinal_avg": 32, "delta": -9, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "walkingStepLength", "acute_avg": 0.57, "longitudinal_avg": 0.65, "delta": -0.08, "unit": "meters", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-07", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Fibromyalgia", "similarity_score": 0.89, "pmcid": "PMC8678901", "title": "Digital Phenotyping of Fibromyalgia Flares", "snippet": "Sustained painsomnia without focal pathology combined with migratory pain and shortened stride defines the fibromyalgia digital flare pattern."},
        {"condition": "Chronic Fatigue Syndrome (ME/CFS)", "similarity_score": 0.72, "pmcid": "PMC7567890", "title": "CFS vs Fibromyalgia: Overlapping Digital Signatures", "snippet": "Post-exertional malaise distinguishes CFS from fibromyalgia, though both share HRV depression and sleep disruption."},
        {"condition": "Myofascial Pain Syndrome", "similarity_score": 0.58, "pmcid": "PMC6456789", "title": "Regional vs Widespread Pain Syndromes", "snippet": "Myofascial trigger points produce regional pain patterns rather than the diffuse four-quadrant distribution of fibromyalgia."}
    ]
}

# PATIENT 16: Imani Thompson - Polycystic Ovarian Cysts + Adnexal Mass
imani = {
    "name": "Imani Thompson",
    "time": "13:30",
    "narrative": "Severe pelvic pressure and bloating, irregular periods skipping 2-3 months, sharp one-sided pain during ovulation attempts.",
    "risk_profile": {"factors": [
        {"category": "Reproductive", "factor": "Adnexal Mass Detected", "description": "Palpable pelvic mass on prior exam with ultrasound showing 6cm complex ovarian cyst.", "severity": "High", "weight": 85},
        {"category": "Hormonal", "factor": "Anovulatory Cycles", "description": "Menstrual cycles skipping 2-3 months consistent with chronic anovulation.", "severity": "High", "weight": 75},
        {"category": "Musculoskeletal", "factor": "Pelvic Guarding Pattern", "description": "Elevated walking asymmetry and DSP indicate compensatory pelvic guarding from mass effect.", "severity": "Elevated", "weight": 68},
        {"category": "Oncological", "factor": "Malignancy Screening Required", "description": "Complex cyst >5cm in reproductive-age woman requires evaluation to exclude borderline or malignant pathology.", "severity": "Elevated", "weight": 72},
    ]},
    "acute_config": {
        "hrv": {"base": 32, "noise": 3, "spikes": {3: (22, "pain_response"), 4: (20, "pain_response")}},
        "rhr": {"base": 74, "noise": 3, "spikes": {3: (82, "elevated"), 4: (84, "elevated")}},
        "temp": {"base": 0.4, "noise": 0.15, "spikes": {3: (0.8, "elevated"), 4: (0.9, "elevated")}},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 2.2, "noise": 0.3, "spikes": {3: (5.5, "guarding_detected"), 4: (6.0, "guarding_detected"), 5: (5.0, "guarding_detected")}},
        "steps": {"base": 6000, "noise": 500, "spikes": {3: (3000, "mobility_drop"), 4: (2800, "mobility_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {3: (4, "pain_disruption"), 4: (5, "pain_disruption")}},
        "spo2": {"base": 97.5, "noise": 0.3},
        "step_len": {"base": 0.65, "noise": 0.02, "spikes": {3: (0.56, "shortened_stride"), 4: (0.54, "shortened_stride")}},
        "dsp": {"base": 25.5, "noise": 0.5, "spikes": {3: (31.0, "guarding_gait"), 4: (32.0, "guarding_gait"), 5: (29.5, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 1.5, "trend": 0},
        "walk": {"base": 1.8, "noise": 0.15, "trend": 0.02},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.01},
        "dsp": {"base": 24.5, "noise": 0.4, "trend": 0.04},
    },
    "menstrual_phases": ["Anovulatory", "Anovulatory", "Anovulatory", "Anovulatory", "Anovulatory", "Anovulatory", "Anovulatory"],
    "clinical_brief": {
        "primary_concern": "Pelvic Bloating & Oligomenorrhea",
        "clinical_intake": "Patient reports severe pelvic pressure, irregular periods skipping months, and sharp unilateral pain during presumed ovulation.",
        "summary": "Pelvic guarding pattern with walking asymmetry reaching 6% and DSP at 32% during acute pain episodes. Temperature elevation of +0.9C during pain days suggests inflammatory component from cyst. Chronic anovulatory pattern across all 7 days correlates with complex ovarian pathology disrupting normal hormonal cycling.",
        "key_symptoms": ["Severe unilateral pelvic pressure and bloating", "Amenorrhea — cycles skipping 2-3 months", "Sharp pain during attempted ovulation", "Pelvic guarding affecting gait symmetry", "Early satiety from abdominal mass effect"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Urgent transvaginal ultrasound with Doppler to characterize cyst complexity", "Tumor markers: CA-125, HE4, and Risk of Malignancy Index calculation", "Gynecology referral for surgical planning if cyst >6cm or complex features", "Serial imaging if watchful waiting chosen — repeat in 6-8 weeks"],
        "cited_sources": ["PMC8789012: Wearable Markers of Ovarian Cyst Burden", "PMC7678901: Digital Gait Assessment in Pelvic Masses", "PMC6567890: Anovulation Patterns in Complex Ovarian Cysts"],
        "guiding_questions": ["Is the pain consistently on one side, or does it alternate?", "Have you noticed increasing abdominal girth or clothing fitting differently?", "When was your last normal menstrual period?", "Is there a family history of ovarian cancer or BRCA mutations?", "Have you experienced any changes in bowel or bladder habits from pressure?"]
    },
    "deltas": [
        {"metric": "walkingAsymmetryPercentage", "acute_avg": 5.2, "longitudinal_avg": 2.0, "delta": 3.2, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "walkingDoubleSupportPercentage", "acute_avg": 30.5, "longitudinal_avg": 24.5, "delta": 6.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.72, "longitudinal_avg": 0.15, "delta": 0.57, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Complex Ovarian Cyst with Adnexal Mass", "similarity_score": 0.88, "pmcid": "PMC8789012", "title": "Wearable Markers of Ovarian Cyst Burden", "snippet": "Pelvic guarding gait with temperature elevation and anovulatory patterns correlates with complex ovarian pathology requiring surgical evaluation."},
        {"condition": "Polycystic Ovary Syndrome (PCOS)", "similarity_score": 0.72, "pmcid": "PMC7678901", "title": "PCOS vs Isolated Ovarian Cyst: Biometric Differentiation", "snippet": "PCOS presents with bilateral small cysts and metabolic features rather than unilateral large mass effect."},
        {"condition": "Ovarian Torsion Risk", "similarity_score": 0.60, "pmcid": "PMC6567890", "title": "Torsion Risk in Large Ovarian Cysts", "snippet": "Cysts >5cm carry elevated torsion risk; acute unilateral pain spikes may herald intermittent torsion episodes."}
    ]
}

# PATIENT 17: Beatrice Mensah - Cervical Dysplasia (HPV-related)
beatrice = {
    "name": "Beatrice Mensah",
    "time": "14:30",
    "narrative": "Abnormal vaginal bleeding between periods, mild pelvic discomfort, abnormal Pap smear results returned as HSIL.",
    "risk_profile": {"factors": [
        {"category": "Oncological", "factor": "High-Grade Squamous Intraepithelial Lesion", "description": "HSIL on Pap smear indicates pre-cancerous cervical changes requiring immediate colposcopy.", "severity": "High", "weight": 88},
        {"category": "Infectious", "factor": "High-Risk HPV Positive", "description": "HPV types 16/18 detected — highest risk for cervical cancer progression.", "severity": "High", "weight": 85},
        {"category": "Inflammatory", "factor": "Moderate Inflammatory Response", "description": "Mild HRV depression and temperature elevation suggest immune system actively responding to dysplastic changes.", "severity": "Moderate", "weight": 55},
        {"category": "Behavioral", "factor": "Screening Gap", "description": "5-year gap between Pap smears, allowing progression from LSIL to HSIL.", "severity": "Elevated", "weight": 62},
    ]},
    "acute_config": {
        "hrv": {"base": 36, "noise": 3, "spikes": {4: (28, "mild_depression")}},
        "rhr": {"base": 70, "noise": 2},
        "temp": {"base": 0.2, "noise": 0.1, "spikes": {4: (0.45, "mild_elevation"), 5: (0.4, "mild_elevation")}},
        "rr": {"base": 14.5, "noise": 0.4},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 7000, "noise": 500},
        "sleep": {"base": 2, "noise": 1, "spikes": {5: (4, "anxiety_disruption")}},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 68, "noise": 1.5, "trend": 0},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.8, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.01},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Irregular", "Irregular", "Follicular", "Follicular", "Irregular", "Irregular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Mild inflammatory biometric signal with wrist temperature elevation to +0.45C and HRV dip to 28ms on day of abnormal bleeding. While biometric changes are moderate, the HSIL cytology and high-risk HPV status represent the critical clinical finding requiring urgent colposcopic evaluation to exclude invasive disease.",
        "key_symptoms": ["Intermenstrual vaginal bleeding — spotting between periods", "Mild chronic pelvic discomfort", "HSIL on Pap smear — high-grade pre-cancerous changes", "High-risk HPV (types 16/18) positive", "Anxiety-related sleep disruption following abnormal results"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Urgent colposcopy with directed biopsies", "Endocervical curettage to assess canal involvement", "HPV genotyping confirmation for types 16/18", "Discuss LEEP or excisional procedure if CIN2/3 confirmed on biopsy"],
        "cited_sources": ["PMC8890123: Cervical Dysplasia Screening Disparities in Black Women", "PMC7789012: HPV-Related Cervical Cancer Prevention Strategies", "PMC6678901: Inflammatory Biomarkers in Cervical Intraepithelial Neoplasia"],
        "guiding_questions": ["When did you first notice the bleeding between periods?", "Have you had previous abnormal Pap smears, and were you followed up?", "Are you aware of your HPV vaccination status?", "Is there any postcoital bleeding — spotting after sexual intercourse?", "When was your last Pap smear before this one, and what was the result?"]
    },
    "deltas": [
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.32, "longitudinal_avg": 0.08, "delta": 0.24, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 33, "longitudinal_avg": 40, "delta": -7, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 2.8, "longitudinal_avg": 1.5, "delta": 1.3, "unit": "count", "clinically_significant": False, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Cervical Intraepithelial Neoplasia (CIN 2/3)", "similarity_score": 0.86, "pmcid": "PMC8890123", "title": "Cervical Dysplasia Screening Disparities in Black Women", "snippet": "HSIL with high-risk HPV requires immediate colposcopy; Black women experience higher rates of late-stage diagnosis due to screening gaps."},
        {"condition": "Cervical Polyp", "similarity_score": 0.62, "pmcid": "PMC7789012", "title": "Benign Cervical Lesions Mimicking Dysplasia", "snippet": "Cervical polyps can cause intermenstrual bleeding and may coexist with dysplastic changes requiring biopsy."},
        {"condition": "Early Invasive Cervical Carcinoma", "similarity_score": 0.48, "pmcid": "PMC6678901", "title": "HSIL to Invasive Cancer: Progression Markers", "snippet": "10-20% of untreated HSIL progresses to invasive cervical cancer within 10 years, emphasizing the urgency of excisional treatment."}
    ]
}

# PATIENT 18: Chidinma Eze - Hyperthyroidism (Graves' Disease)
chidinma = {
    "name": "Chidinma Eze",
    "time": "16:00",
    "narrative": "Heart pounding constantly, hand tremor making it hard to write, cannot tolerate heat, lost 10 pounds without trying, severe anxiety.",
    "risk_profile": {"factors": [
        {"category": "Endocrine", "factor": "Thyrotoxicosis", "description": "Classic Graves' triad: diffuse goiter, exophthalmos, and pretibial myxedema reported.", "severity": "High", "weight": 90},
        {"category": "Cardiovascular", "factor": "Thyroid-Driven Tachycardia", "description": "RHR sustained 90-115 bpm without exertion — thyroid hormone excess directly stimulating cardiac pacemaker cells.", "severity": "High", "weight": 88},
        {"category": "Metabolic", "factor": "Hypermetabolic State", "description": "Wrist temperature sustained +0.9C deviation reflecting massively elevated basal metabolic rate.", "severity": "High", "weight": 82},
        {"category": "Psychiatric", "factor": "Thyroid-Induced Anxiety", "description": "Severe anxiety and tremor from thyroid hormone excess on beta-adrenergic receptors.", "severity": "Elevated", "weight": 68},
    ]},
    "acute_config": {
        "hrv": {"base": 22, "noise": 5, "spikes": {2: (14, "crashed"), 4: (12, "crashed"), 6: (15, "crashed")}},
        "rhr": {"base": 98, "noise": 6, "spikes": {2: (112, "tachycardia"), 4: (115, "tachycardia"), 6: (108, "tachycardia")}},
        "temp": {"base": 0.8, "noise": 0.1, "spikes": {2: (1.1, "hypermetabolic"), 4: (1.2, "hypermetabolic"), 6: (1.0, "hypermetabolic")}},
        "rr": {"base": 17, "noise": 0.5, "spikes": {4: (20, "elevated")}},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 7000, "noise": 600},
        "sleep": {"base": 2, "noise": 1, "spikes": {1: (4, "insomnia"), 3: (5, "insomnia"), 5: (4, "insomnia")}},
        "spo2": {"base": 97.5, "noise": 0.3},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 88, "noise": 3, "trend": 0.4, "spikes": {25: (None, "creeping_elevation")}},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.01},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Oligomenorrhea", "Oligomenorrhea", "Oligomenorrhea", "Oligomenorrhea", "Oligomenorrhea", "Oligomenorrhea", "Oligomenorrhea"],
    "clinical_brief": {
        "primary_concern": "Undiagnosed Pelvic Pain",
        "clinical_intake": "Patient complains of severe lower back pain, pelvic pressure, and painful periods that cause her to miss work.",
        "summary": "Sustained tachycardia with RHR reaching 115 bpm and HRV crashing to 12ms reflects thyroid hormone excess driving cardiac hyperexcitability. Wrist temperature sustained at +1.2C deviation — the highest in the cohort — confirms hypermetabolic state. Pattern of every-other-day symptom spikes is consistent with fluctuating thyroid storm activity.",
        "key_symptoms": ["Persistent tachycardia with RHR 90-115 bpm at rest", "Fine hand tremor interfering with fine motor tasks", "Heat intolerance — unable to tolerate room temperature", "Unintentional weight loss of 10 pounds in 6 weeks", "Severe anxiety with insomnia"],
        "severity_assessment": "High",
        "recommended_actions": ["Stat TSH, free T4, free T3 — expect suppressed TSH with elevated T3/T4", "TSH receptor antibodies (TRAb) to confirm Graves' disease", "ECG to assess for atrial fibrillation or other thyroid-driven arrhythmia", "Beta-blocker (propranolol) for symptomatic tachycardia relief pending antithyroid therapy"],
        "cited_sources": ["PMC9012345: Wearable Tachycardia Patterns in Thyrotoxicosis", "PMC8901234: Thermometric Signature of Graves' Disease", "PMC7890123: Cardiac Complications of Untreated Hyperthyroidism"],
        "guiding_questions": ["Have you noticed your eyes appearing more prominent or experiencing double vision?", "How long have you been aware of the rapid heartbeat — weeks, months?", "Have you noticed a visible swelling in the front of your neck?", "Is there a family history of thyroid disease, particularly in female relatives?", "Have you experienced any changes in bowel frequency — more frequent loose stools?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 108, "longitudinal_avg": 92, "delta": 16, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 16, "longitudinal_avg": 28, "delta": -12, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.95, "longitudinal_avg": 0.3, "delta": 0.65, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Graves' Disease (Thyrotoxicosis)", "similarity_score": 0.94, "pmcid": "PMC9012345", "title": "Wearable Tachycardia Patterns in Thyrotoxicosis", "snippet": "Sustained RHR above 100 bpm with very low HRV and extreme wrist temperature elevation forms the digital triad of Graves' disease."},
        {"condition": "Thyroid Storm", "similarity_score": 0.72, "pmcid": "PMC8901234", "title": "Subclinical Thyroid Storm: Early Detection via Wearables", "snippet": "Intermittent spikes to 115+ bpm with temperature exceeding +1.0C may indicate subclinical thyroid storm episodes."},
        {"condition": "Pheochromocytoma", "similarity_score": 0.52, "pmcid": "PMC7890123", "title": "Adrenergic Excess: Thyroid vs Adrenal Etiologies", "snippet": "Episodic tachycardia with anxiety can mimic thyrotoxicosis; 24-hour catecholamines should be considered if TSH is normal."}
    ]
}

# PATIENT 19: Adaeze Obi - Rheumatoid Arthritis (early-stage)
adaeze = {
    "name": "Adaeze Obi",
    "time": "08:45",
    "narrative": "Morning joint stiffness lasting over an hour, symmetric swelling in fingers and wrists, fatigue and low-grade fevers.",
    "risk_profile": {"factors": [
        {"category": "Immunological", "factor": "Autoimmune Polyarthritis", "description": "Symmetric small-joint involvement with morning stiffness >60 minutes classic for RA.", "severity": "High", "weight": 85},
        {"category": "Inflammatory", "factor": "Systemic Inflammatory Burden", "description": "Elevated wrist temperature and depressed HRV indicate sustained inflammatory response.", "severity": "High", "weight": 78},
        {"category": "Musculoskeletal", "factor": "Gait Deterioration", "description": "Shortened step length and elevated DSP from pain-avoidant movement compensations.", "severity": "Elevated", "weight": 65},
        {"category": "Genetic", "factor": "HLA-DR4 Risk", "description": "Family history of autoimmune disease increases shared epitope susceptibility.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 34, "noise": 3, "spikes": {3: (26, "depressed"), 4: (24, "depressed"), 5: (27, "depressed")}},
        "rhr": {"base": 73, "noise": 2, "spikes": {3: (78, "elevated"), 4: (80, "elevated")}},
        "temp": {"base": 0.3, "noise": 0.1, "spikes": {3: (0.6, "inflammatory"), 4: (0.65, "inflammatory"), 5: (0.55, "inflammatory")}},
        "rr": {"base": 15, "noise": 0.4},
        "walk": {"base": 1.8, "noise": 0.2, "spikes": {3: (3.2, "stiffness_compensation")}},
        "steps": {"base": 6000, "noise": 400, "spikes": {3: (3800, "morning_limitation"), 4: (3500, "morning_limitation")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {3: (4, "stiffness_waking"), 4: (4, "stiffness_waking")}},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.64, "noise": 0.02, "spikes": {3: (0.56, "shortened_stride"), 4: (0.55, "shortened_stride")}},
        "dsp": {"base": 25.5, "noise": 0.5, "spikes": {3: (29.5, "guarding_gait"), 4: (30.0, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 1.5, "trend": 0.1},
        "walk": {"base": 1.5, "noise": 0.15, "trend": 0.01},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.67, "noise": 0.01, "trend": -0.001},
        "dsp": {"base": 24.5, "noise": 0.4, "trend": 0.04},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Follicular", "Ovulatory", "Ovulatory", "Luteal", "Luteal"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Symmetric small-joint stiffness with biometric inflammatory signature: wrist temperature elevated to +0.65C during flare days while HRV dropped 30% to 24ms. Step length shortened 18% and DSP rose to 30%, indicating pain-avoidant gait mechanics consistent with active inflammatory arthropathy.",
        "key_symptoms": ["Morning stiffness lasting >60 minutes in fingers and wrists", "Symmetric small-joint swelling — MCP and PIP joints", "Low-grade fevers accompanying joint flares", "Fatigue disproportionate to activity", "Grip weakness affecting daily tasks"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Stat RF, anti-CCP antibodies, ESR, and CRP", "X-ray hands and feet for baseline erosion assessment", "Rheumatology referral for early DMARD initiation", "Musculoskeletal ultrasound of affected joints for synovitis"],
        "cited_sources": ["PMC8345012: Early RA Detection via Wearable Gait Analysis", "PMC7234012: Inflammatory Biomarkers and HRV in Autoimmune Arthritis", "PMC6123012: Step Length as Functional Marker in Rheumatoid Arthritis"],
        "guiding_questions": ["Does the stiffness improve with movement or worsen with activity?", "Are the swollen joints warm to the touch?", "Is there a family history of rheumatoid arthritis or other autoimmune diseases?", "Have you noticed any nodules or bumps near your elbows or fingers?", "How has the joint stiffness affected your ability to work and perform daily activities?"]
    },
    "deltas": [
        {"metric": "walkingStepLength", "acute_avg": 0.57, "longitudinal_avg": 0.67, "delta": -0.10, "unit": "meters", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.52, "longitudinal_avg": 0.12, "delta": 0.40, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 27, "longitudinal_avg": 38, "delta": -11, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Rheumatoid Arthritis (Early-Stage)", "similarity_score": 0.90, "pmcid": "PMC8345012", "title": "Early RA Detection via Wearable Gait Analysis", "snippet": "Symmetric small-joint involvement with morning stiffness >60 min and inflammatory gait compensation is classic early RA presentation."},
        {"condition": "Psoriatic Arthritis", "similarity_score": 0.68, "pmcid": "PMC7234012", "title": "PsA vs RA: Digital Differentiation", "snippet": "PsA typically presents asymmetrically with dactylitis and enthesitis, distinguishing it from symmetric RA."},
        {"condition": "Systemic Lupus Erythematosus", "similarity_score": 0.54, "pmcid": "PMC6123012", "title": "SLE Arthritis vs RA: Clinical and Biometric Overlap", "snippet": "Lupus arthritis is typically non-erosive and may present with similar symmetric joint pattern but with systemic features."}
    ]
}

# PATIENT 20: Saoirse Murphy - Multiple Sclerosis (Relapsing-Remitting)
saoirse = {
    "name": "Saoirse Murphy",
    "time": "11:30",
    "narrative": "Extreme fatigue hitting like a wall, legs feel heavy and weak, cognitive fog so bad she forgets mid-sentence, vision blurred in one eye last month.",
    "risk_profile": {"factors": [
        {"category": "Neurological", "factor": "Relapsing-Remitting MS", "description": "Prior optic neuritis episode with new gait dysfunction suggests active demyelinating disease.", "severity": "High", "weight": 90},
        {"category": "Musculoskeletal", "factor": "Severe Gait Dysfunction", "description": "Very shortened step length and very elevated DSP indicate lower extremity weakness and spasticity.", "severity": "High", "weight": 85},
        {"category": "Autonomic", "factor": "Autonomic Dysregulation", "description": "Very low HRV suggests MS-related autonomic nervous system involvement.", "severity": "High", "weight": 78},
        {"category": "Cognitive", "factor": "MS Cognitive Impairment", "description": "Word-finding difficulty and processing speed reduction consistent with MS-related cognitive decline.", "severity": "Elevated", "weight": 68},
    ]},
    "acute_config": {
        "hrv": {"base": 30, "noise": 3, "spikes": {3: (18, "crashed"), 4: (16, "crashed"), 5: (19, "crashed")}},
        "rhr": {"base": 76, "noise": 3, "spikes": {4: (82, "elevated")}},
        "temp": {"base": 0.1, "noise": 0.1, "spikes": {4: (0.4, "mild_elevation")}},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 3.0, "noise": 0.4, "spikes": {3: (5.5, "ataxic_gait"), 4: (6.0, "ataxic_gait"), 5: (5.2, "ataxic_gait")}},
        "steps": {"base": 3500, "noise": 400, "spikes": {3: (1500, "fatigue_collapse"), 4: (1200, "fatigue_collapse"), 5: (1800, "fatigue_collapse")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {3: (5, "spasticity_waking"), 4: (5, "spasticity_waking")}},
        "spo2": {"base": 96.8, "noise": 0.4, "spikes": {4: (95.0, "dip_detected")}},
        "step_len": {"base": 0.52, "noise": 0.03, "spikes": {3: (0.40, "very_shortened"), 4: (0.38, "very_shortened"), 5: (0.42, "very_shortened")}},
        "dsp": {"base": 30.0, "noise": 0.8, "spikes": {3: (37.0, "severe_instability"), 4: (38.5, "severe_instability"), 5: (36.0, "severe_instability")}},
    },
    "long_config": {
        "rhr": {"base": 72, "noise": 1.5, "trend": 0.1},
        "walk": {"base": 2.2, "noise": 0.2, "trend": 0.03},
        "spo2": {"base": 97.0, "noise": 0.3},
        "step_len": {"base": 0.58, "noise": 0.02, "trend": -0.003},
        "dsp": {"base": 28.0, "noise": 0.6, "trend": 0.08},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Follicular", "Ovulatory", "Luteal", "Luteal", "Luteal"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Severe gait dysfunction with step length crashing to 0.38m and DSP reaching 38.5% — the most extreme mobility signature in the cohort. HRV collapsed to 16ms during the relapse window. Combined with recent optic neuritis and cognitive fog, the biometric pattern is consistent with an active MS relapse causing pyramidal tract dysfunction.",
        "key_symptoms": ["Extreme fatigue — unable to sustain activity beyond 2 hours", "Lower extremity weakness and heaviness in both legs", "Cognitive fog — word-finding difficulty and memory lapses", "Prior optic neuritis episode with transient monocular vision loss", "Very shortened stride with severe gait instability"],
        "severity_assessment": "High",
        "recommended_actions": ["Urgent MRI brain and spine with gadolinium for new demyelinating lesions", "Neurology referral for relapse confirmation and IV methylprednisolone consideration", "Evoked potentials (visual, somatosensory) for subclinical lesion detection", "Disease-modifying therapy optimization if already on treatment"],
        "cited_sources": ["PMC9234567: Wearable Gait Metrics in Multiple Sclerosis Relapses", "PMC8123890: Step Length as Disability Marker in MS", "PMC7012890: Autonomic Dysfunction in Relapsing-Remitting MS"],
        "guiding_questions": ["When did the leg weakness start, and has it been progressively worsening?", "Have you experienced any numbness, tingling, or electric shock sensations down your spine?", "How has the cognitive fog affected your work and daily functioning?", "Are you currently on any disease-modifying therapy for MS?", "Have you noticed symptoms worsening with heat — hot showers, warm weather?"]
    },
    "deltas": [
        {"metric": "walkingStepLength", "acute_avg": 0.40, "longitudinal_avg": 0.56, "delta": -0.16, "unit": "meters", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "walkingDoubleSupportPercentage", "acute_avg": 37.2, "longitudinal_avg": 28.5, "delta": 8.7, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 18, "longitudinal_avg": 34, "delta": -16, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "stepCount", "acute_avg": 1500, "longitudinal_avg": 3500, "delta": -2000, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Multiple Sclerosis Relapse (Pyramidal)", "similarity_score": 0.93, "pmcid": "PMC9234567", "title": "Wearable Gait Metrics in Multiple Sclerosis Relapses", "snippet": "Step length crash below 0.40m with DSP exceeding 37% during an acute episode is diagnostic of MS-related pyramidal tract relapse."},
        {"condition": "Transverse Myelitis", "similarity_score": 0.70, "pmcid": "PMC8123890", "title": "Transverse Myelitis vs MS: First Episode Differentiation", "snippet": "Isolated myelitis may represent first MS presentation or remain monophasic; MRI dissemination criteria distinguish them."},
        {"condition": "Neuromyelitis Optica Spectrum Disorder", "similarity_score": 0.58, "pmcid": "PMC7012890", "title": "NMOSD vs MS: Clinical and Biometric Distinctions", "snippet": "Optic neuritis with myelitis should prompt AQP4-IgG testing to differentiate NMOSD from MS."}
    ]
}

# PATIENT 21: Maya Patel - Celiac Disease + Iron Deficiency Anemia
maya = {
    "name": "Maya Patel",
    "time": "12:15",
    "narrative": "Constant bloating and abdominal pain after eating, profound dizziness when standing, extreme fatigue, tongue sores.",
    "risk_profile": {"factors": [
        {"category": "Gastrointestinal", "factor": "Malabsorption Syndrome", "description": "Chronic GI distress with weight loss and nutritional deficiencies suggest villous atrophy from celiac disease.", "severity": "High", "weight": 82},
        {"category": "Hematological", "factor": "Iron Deficiency Anemia", "description": "Compensatory tachycardia (RHR 80-88 bpm) with low SpO2 (93-95%) indicates significant anemia from malabsorption.", "severity": "High", "weight": 80},
        {"category": "Nutritional", "factor": "Micronutrient Deficiencies", "description": "Glossitis (tongue sores) suggests concurrent B12 and folate deficiency from damaged intestinal villi.", "severity": "Elevated", "weight": 68},
        {"category": "Autonomic", "factor": "Orthostatic Symptoms", "description": "Dizziness upon standing consistent with anemia-related orthostatic hypotension.", "severity": "Moderate", "weight": 58},
    ]},
    "acute_config": {
        "hrv": {"base": 28, "noise": 3, "spikes": {3: (22, "depressed"), 5: (20, "depressed")}},
        "rhr": {"base": 82, "noise": 3, "spikes": {3: (88, "compensatory_tachy"), 5: (90, "compensatory_tachy")}},
        "temp": {"base": 0.1, "noise": 0.1},
        "rr": {"base": 16, "noise": 0.5, "spikes": {5: (19, "elevated")}},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 5000, "noise": 500, "spikes": {3: (3000, "fatigue_drop"), 5: (2800, "fatigue_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {2: (4, "GI_disruption"), 4: (4, "GI_disruption")}},
        "spo2": {"base": 94.0, "noise": 0.5, "spikes": {3: (92.5, "hypoxia_risk"), 5: (93.0, "low_trend")}},
        "step_len": {"base": 0.64, "noise": 0.02, "spikes": {3: (0.58, "shortened_stride"), 5: (0.57, "shortened_stride")}},
        "dsp": {"base": 25.5, "noise": 0.5, "spikes": {3: (28.5, "instability"), 5: (29.0, "instability")}},
    },
    "long_config": {
        "rhr": {"base": 75, "noise": 2, "trend": 0.3},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 95.5, "noise": 0.4, "trend": -0.06},
        "step_len": {"base": 0.66, "noise": 0.02, "trend": -0.001},
        "dsp": {"base": 24.5, "noise": 0.4},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Ovulatory", "Ovulatory", "Luteal", "Luteal", "Luteal"],
    "clinical_brief": {
        "primary_concern": "Premature Ovarian Insufficiency",
        "clinical_intake": "Patient reports cessation of menses for 6 months, severe hot flashes, vaginal dryness, and mood swings at age 34.",
        "summary": "Compensatory tachycardia reaching 90 bpm with SpO2 dipping to 92.5% confirms significant anemia. Longitudinal RHR trending upward over 6 months while SpO2 trends downward — the body progressively failing to compensate for iron malabsorption. GI symptoms with glossitis point to celiac-driven malabsorption as the root cause.",
        "key_symptoms": ["Chronic bloating and abdominal pain postprandially", "Profound fatigue with exercise intolerance", "Dizziness upon standing — near-syncope episodes", "Glossitis — painful tongue sores and smooth tongue", "Unintentional weight loss despite normal appetite"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Stat CBC with iron studies, ferritin, B12, folate, and reticulocyte count", "Tissue transglutaminase (tTG-IgA) antibody with total IgA level", "Upper endoscopy with duodenal biopsies if celiac serology positive", "IV iron infusion if hemoglobin <9 g/dL or oral iron intolerant"],
        "cited_sources": ["PMC8456012: Anemia Detection via Wearable SpO2 and Heart Rate Trends", "PMC7345012: Celiac Disease and Secondary Iron Deficiency", "PMC6234012: Digital Biomarkers of Malabsorption Syndromes"],
        "guiding_questions": ["Are the GI symptoms worse after eating bread, pasta, or other wheat-containing foods?", "Have you noticed any skin rashes — particularly itchy blisters on elbows or knees?", "How long have you been experiencing the dizziness, and does it worsen with position changes?", "Have you been tested for celiac disease or food intolerances previously?", "Is there a family history of celiac disease, type 1 diabetes, or thyroid disease?"]
    },
    "deltas": [
        {"metric": "bloodOxygenSaturation", "acute_avg": 93.2, "longitudinal_avg": 95.5, "delta": -2.3, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 86, "longitudinal_avg": 78, "delta": 8, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-06", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 23, "longitudinal_avg": 32, "delta": -9, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Celiac Disease with Iron Deficiency Anemia", "similarity_score": 0.89, "pmcid": "PMC8456012", "title": "Anemia Detection via Wearable SpO2 and Heart Rate Trends", "snippet": "Progressive SpO2 decline with compensatory tachycardia over months is a digital signature of slowly worsening anemia from malabsorption."},
        {"condition": "Inflammatory Bowel Disease (Crohn's)", "similarity_score": 0.68, "pmcid": "PMC7345012", "title": "IBD vs Celiac: Overlapping Malabsorption Patterns", "snippet": "Crohn's disease affecting the proximal small bowel can produce identical iron malabsorption and anemia patterns."},
        {"condition": "Autoimmune Gastritis with Pernicious Anemia", "similarity_score": 0.55, "pmcid": "PMC6234012", "title": "B12 Deficiency from Autoimmune Gastritis", "snippet": "Glossitis with anemia should prompt B12 assessment alongside iron — autoimmune gastritis may coexist with celiac."}
    ]
}

# PATIENT 22: Lena Becker - Atrial Fibrillation (Paroxysmal)
lena = {
    "name": "Lena Becker",
    "time": "15:15",
    "narrative": "Heart racing out of nowhere then stopping suddenly, shortness of breath during episodes, fatigue after palpitations resolve.",
    "risk_profile": {"factors": [
        {"category": "Cardiovascular", "factor": "Paroxysmal Atrial Fibrillation", "description": "Extremely erratic RHR with spikes to 130+ bpm and precipitous drops — classic paroxysmal AFib pattern.", "severity": "High", "weight": 92},
        {"category": "Cardiovascular", "factor": "Stroke Risk (CHA2DS2-VASc)", "description": "Age 52 and female sex contribute to elevated thromboembolic risk during AFib episodes.", "severity": "High", "weight": 85},
        {"category": "Autonomic", "factor": "Severe HRV Disruption", "description": "Very low and highly variable HRV reflects chaotic atrial electrical activity.", "severity": "High", "weight": 80},
        {"category": "Respiratory", "factor": "Episodic Desaturation", "description": "Slightly low SpO2 during AFib episodes from reduced cardiac output.", "severity": "Elevated", "weight": 65},
    ]},
    "acute_config": {
        "hrv": {"base": 18, "noise": 8, "spikes": {1: (8, "chaotic"), 3: (6, "chaotic"), 5: (10, "chaotic")}},
        "rhr": {"base": 82, "noise": 15, "spikes": {1: (132, "afib_episode"), 3: (128, "afib_episode"), 5: (135, "afib_episode")}},
        "temp": {"base": 0.05, "noise": 0.08},
        "rr": {"base": 16, "noise": 0.5, "spikes": {1: (22, "dyspnea"), 3: (21, "dyspnea"), 5: (20, "dyspnea")}},
        "walk": {"base": 1.5, "noise": 0.3},
        "steps": {"base": 5500, "noise": 600, "spikes": {1: (2500, "episode_limitation"), 3: (2000, "episode_limitation")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {1: (4, "palpitation_waking"), 3: (5, "palpitation_waking"), 5: (4, "palpitation_waking")}},
        "spo2": {"base": 96.0, "noise": 0.5, "spikes": {1: (93.5, "episode_desaturation"), 3: (94.0, "episode_desaturation"), 5: (93.8, "episode_desaturation")}},
        "step_len": {"base": 0.68, "noise": 0.03},
        "dsp": {"base": 23.0, "noise": 0.5},
    },
    "long_config": {
        "rhr": {"base": 75, "noise": 5, "trend": 0},
        "walk": {"base": 1.3, "noise": 0.15, "trend": 0},
        "spo2": {"base": 96.5, "noise": 0.3},
        "step_len": {"base": 0.68, "noise": 0.02},
        "dsp": {"base": 23.0, "noise": 0.4},
    },
    "menstrual_phases": ["Postmenopausal", "Postmenopausal", "Postmenopausal", "Postmenopausal", "Postmenopausal", "Postmenopausal", "Postmenopausal"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Extremely erratic RHR with spikes to 135 bpm followed by normalizations — classic paroxysmal AFib on wearable data. HRV crashed to 6ms during episodes reflecting chaotic atrial activity. SpO2 dipping to 93.5% during episodes confirms hemodynamic compromise requiring anticoagulation assessment.",
        "key_symptoms": ["Paroxysmal palpitations — sudden onset and offset", "Shortness of breath during palpitation episodes", "SpO2 desaturation to 93.5% during episodes", "Post-episode fatigue lasting hours", "Exercise intolerance on episode days"],
        "severity_assessment": "High",
        "recommended_actions": ["12-lead ECG during symptoms or 14-day continuous Holter monitor", "Echocardiogram to assess atrial size and ventricular function", "CHA2DS2-VASc score calculation for anticoagulation decision", "Cardiology referral for rhythm vs rate control strategy"],
        "cited_sources": ["PMC9345678: Wearable Detection of Paroxysmal Atrial Fibrillation", "PMC8234678: Heart Rate Variability Patterns in AFib", "PMC7123678: Stroke Prevention in Paroxysmal Atrial Fibrillation"],
        "guiding_questions": ["How often are you experiencing the palpitation episodes — daily, weekly?", "Do the episodes start and stop suddenly, or do they build gradually?", "Have you experienced any lightheadedness, near-fainting, or actual fainting during episodes?", "Are you aware of any family history of atrial fibrillation or stroke?", "Have you had your thyroid function checked recently?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 105, "longitudinal_avg": 75, "delta": 30, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 10, "longitudinal_avg": 25, "delta": -15, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "down"},
        {"metric": "bloodOxygenSaturation", "acute_avg": 94.2, "longitudinal_avg": 96.5, "delta": -2.3, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Paroxysmal Atrial Fibrillation", "similarity_score": 0.95, "pmcid": "PMC9345678", "title": "Wearable Detection of Paroxysmal Atrial Fibrillation", "snippet": "Extreme RHR variability with spikes >130 bpm and HRV collapse below 10ms is the digital hallmark of paroxysmal AFib captured by consumer wearables."},
        {"condition": "Supraventricular Tachycardia (SVT)", "similarity_score": 0.72, "pmcid": "PMC8234678", "title": "SVT vs AFib on Wearable Data", "snippet": "SVT produces regular rapid heart rate without the irregularity seen in AFib; differentiation requires ECG confirmation."},
        {"condition": "Sick Sinus Syndrome", "similarity_score": 0.55, "pmcid": "PMC7123678", "title": "Tachy-Brady Syndrome in Older Adults", "snippet": "Alternating bradycardia and tachycardia may indicate sick sinus syndrome, particularly in postmenopausal women."}
    ]
}

# PATIENT 23: Marcus Johnson - Hypertensive Heart Disease
marcus = {
    "name": "Marcus Johnson",
    "time": "16:30",
    "narrative": "Persistent headaches, shortness of breath climbing stairs, chest tightness with exertion, vision changes.",
    "risk_profile": {"factors": [
        {"category": "Cardiovascular", "factor": "Uncontrolled Hypertension", "description": "Sustained elevated RHR 92-108 bpm reflecting chronically elevated afterload from hypertension.", "severity": "High", "weight": 90},
        {"category": "Cardiovascular", "factor": "Left Ventricular Hypertrophy Risk", "description": "Prolonged pressure overload increases risk of LVH and eventual heart failure.", "severity": "High", "weight": 85},
        {"category": "Neurological", "factor": "Hypertensive Headaches", "description": "Morning headaches with vision changes suggest end-organ damage from sustained BP elevation.", "severity": "Elevated", "weight": 70},
        {"category": "Racial", "factor": "Disparate Hypertension Burden", "description": "Black men develop hypertension earlier and with greater severity than other demographics.", "severity": "High", "weight": 78},
    ]},
    "acute_config": {
        "hrv": {"base": 25, "noise": 3, "spikes": {3: (18, "depressed"), 5: (20, "depressed")}},
        "rhr": {"base": 98, "noise": 4, "spikes": {2: (105, "hypertensive"), 4: (108, "hypertensive"), 6: (102, "hypertensive")}},
        "temp": {"base": 0.15, "noise": 0.08},
        "rr": {"base": 16, "noise": 0.5, "spikes": {4: (20, "exertional_dyspnea")}},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 5000, "noise": 500, "spikes": {4: (3000, "exercise_intolerance")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {2: (4, "nocturia"), 4: (4, "nocturia")}},
        "spo2": {"base": 95.5, "noise": 0.4, "spikes": {4: (94.0, "exertional_dip")}},
        "step_len": {"base": 0.72, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 92, "noise": 2.5, "trend": 0.3, "spikes": {25: (None, "sustained_elevation")}},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 96.0, "noise": 0.3, "trend": -0.03},
        "step_len": {"base": 0.72, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": [],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Sustained RHR elevation at 92-108 bpm with longitudinal upward trend over 6 months reflects chronic pressure overload from uncontrolled hypertension. HRV depressed to 18ms during exertional episodes. SpO2 dipping to 94% with exertion suggests early cardiac decompensation. Black men face 2x hypertension mortality risk requiring aggressive management.",
        "key_symptoms": ["Persistent morning headaches with visual disturbance", "Shortness of breath with moderate exertion — climbing one flight", "Chest tightness and pressure during physical activity", "Nocturia — 2-3 bathroom trips per night", "Exercise intolerance worsening over months"],
        "severity_assessment": "High",
        "recommended_actions": ["Stat ambulatory blood pressure monitoring (24-hour ABPM)", "ECG and echocardiogram for LVH and diastolic function assessment", "Comprehensive metabolic panel and lipid profile", "Ophthalmology referral for hypertensive retinopathy screening"],
        "cited_sources": ["PMC9456789: Wearable Heart Rate as Hypertension Severity Proxy", "PMC8345789: Racial Disparities in Hypertensive Heart Disease Outcomes", "PMC7234789: Digital Biomarkers of Cardiac Decompensation in Hypertension"],
        "guiding_questions": ["How long have you been aware of your blood pressure being high?", "Are you currently taking any blood pressure medications, and are you taking them consistently?", "Have you experienced any episodes of chest pain at rest or with exertion?", "Is there a family history of heart disease, stroke, or kidney disease?", "How much salt do you consume, and do you engage in regular physical activity?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 103, "longitudinal_avg": 95, "delta": 8, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 21, "longitudinal_avg": 30, "delta": -9, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "bloodOxygenSaturation", "acute_avg": 95.0, "longitudinal_avg": 96.2, "delta": -1.2, "unit": "%", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Hypertensive Heart Disease", "similarity_score": 0.91, "pmcid": "PMC9456789", "title": "Wearable Heart Rate as Hypertension Severity Proxy", "snippet": "Sustained RHR >95 bpm with progressive upward trend over months correlates with uncontrolled hypertension and LVH development."},
        {"condition": "Heart Failure with Preserved Ejection Fraction", "similarity_score": 0.72, "pmcid": "PMC8345789", "title": "HFpEF in Hypertensive Patients", "snippet": "Exertional dyspnea with exercise intolerance and nocturnal symptoms may indicate HFpEF from chronic pressure overload."},
        {"condition": "Renal Artery Stenosis", "similarity_score": 0.54, "pmcid": "PMC7234789", "title": "Secondary Hypertension: Renovascular Etiologies", "snippet": "Resistant hypertension with progressive renal impairment should prompt evaluation for renovascular disease."}
    ]
}

# PATIENT 24: Aisha Diallo - Crohn's Disease (Active Flare)
aisha = {
    "name": "Aisha Diallo",
    "time": "08:15",
    "narrative": "Severe abdominal cramping with bloody diarrhea 8-10 times daily, profound fatigue, joint pains accompanying flare.",
    "risk_profile": {"factors": [
        {"category": "Gastrointestinal", "factor": "Active Crohn's Flare", "description": "Bloody diarrhea 8-10 times daily indicates moderate-to-severe active Crohn's disease.", "severity": "High", "weight": 88},
        {"category": "Inflammatory", "factor": "Systemic Inflammatory Response", "description": "Elevated wrist temperature and depressed HRV confirm systemic inflammation beyond the GI tract.", "severity": "High", "weight": 80},
        {"category": "Musculoskeletal", "factor": "Extraintestinal Manifestations", "description": "Joint pain accompanying GI flare suggests enteropathic arthritis — affects 20-30% of IBD patients.", "severity": "Elevated", "weight": 65},
        {"category": "Nutritional", "factor": "Malnutrition Risk", "description": "Active flare with diarrhea increases malabsorption and dehydration risk.", "severity": "Elevated", "weight": 68},
    ]},
    "acute_config": {
        "hrv": {"base": 30, "noise": 3, "spikes": {2: (20, "flare_crash"), 3: (18, "flare_crash"), 4: (19, "flare_crash")}},
        "rhr": {"base": 78, "noise": 3, "spikes": {2: (86, "flare_elevated"), 3: (88, "flare_elevated"), 4: (85, "flare_elevated")}},
        "temp": {"base": 0.4, "noise": 0.1, "spikes": {2: (0.7, "inflammatory"), 3: (0.8, "inflammatory"), 4: (0.75, "inflammatory")}},
        "rr": {"base": 15, "noise": 0.5, "spikes": {3: (18, "elevated")}},
        "walk": {"base": 1.5, "noise": 0.2, "spikes": {3: (3.0, "guarding_detected")}},
        "steps": {"base": 5500, "noise": 400, "spikes": {2: (3000, "flare_limitation"), 3: (2500, "flare_limitation"), 4: (3200, "flare_limitation")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {2: (5, "urgency_waking"), 3: (6, "urgency_waking"), 4: (5, "urgency_waking")}},
        "spo2": {"base": 97.2, "noise": 0.3},
        "step_len": {"base": 0.67, "noise": 0.02, "spikes": {3: (0.60, "shortened_stride")}},
        "dsp": {"base": 23.5, "noise": 0.5, "spikes": {3: (27.0, "guarding_gait")}},
    },
    "long_config": {
        "rhr": {"base": 72, "noise": 2, "trend": 0.1},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.2, "noise": 0.2},
        "step_len": {"base": 0.68, "noise": 0.01},
        "dsp": {"base": 23.0, "noise": 0.4},
    },
    "menstrual_phases": ["Luteal", "Luteal", "Menstrual", "Menstrual", "Menstrual", "Follicular", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Heart Palpitations & Tremors",
        "clinical_intake": "Patient presents with sudden weight loss of 10 lbs, hand tremors, severe heat intolerance, and resting tachycardia.",
        "summary": "Active Crohn's flare signature: wrist temperature sustained at +0.8C with HRV crashing to 18ms and RHR spiking to 88 bpm over 3 consecutive days. Sleep fragmented by bowel urgency at 5-6 awakenings nightly. Step count dropped 55% from baseline, confirming systemic inflammatory decompensation.",
        "key_symptoms": ["Severe abdominal cramping with bloody diarrhea 8-10x daily", "Profound fatigue unrelieved by rest", "Bilateral joint pain in knees and ankles (enteropathic)", "Sleep completely disrupted by nocturnal bowel urgency", "Unintentional weight loss during flare"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Stat CRP, ESR, fecal calprotectin for disease activity quantification", "Stool studies to exclude superimposed C. difficile infection", "Colonoscopy with biopsies to assess mucosal severity", "Gastroenterology consult for biologic therapy escalation"],
        "cited_sources": ["PMC8567012: Wearable Inflammatory Markers in IBD Flares", "PMC7456012: HRV Depression During Active Crohn's Disease", "PMC6345789: Digital Monitoring of Inflammatory Bowel Disease Activity"],
        "guiding_questions": ["When did this flare begin, and was there a potential trigger — stress, missed medication?", "How many bowel movements are you having per day, and is there visible blood?", "Are you currently on any biologic or immunosuppressive therapy?", "Have you experienced any mouth ulcers, skin rashes, or eye inflammation with this flare?", "Have you been able to maintain adequate fluid and nutritional intake?"]
    },
    "deltas": [
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.68, "longitudinal_avg": 0.10, "delta": 0.58, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 21, "longitudinal_avg": 35, "delta": -14, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "restingHeartRate", "acute_avg": 84, "longitudinal_avg": 74, "delta": 10, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 5.3, "longitudinal_avg": 2.0, "delta": 3.3, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Crohn's Disease (Active Flare)", "similarity_score": 0.91, "pmcid": "PMC8567012", "title": "Wearable Inflammatory Markers in IBD Flares", "snippet": "Concurrent wrist temperature elevation, HRV crash, and sleep fragmentation from bowel urgency form the digital triad of active Crohn's flare."},
        {"condition": "Ulcerative Colitis", "similarity_score": 0.74, "pmcid": "PMC7456012", "title": "UC vs Crohn's: Digital Flare Signatures", "snippet": "UC presents with continuous colonic inflammation and bloody diarrhea but lacks the skip lesions and transmural involvement of Crohn's."},
        {"condition": "Infectious Colitis (C. difficile)", "similarity_score": 0.56, "pmcid": "PMC6345789", "title": "C. difficile Superinfection in IBD", "snippet": "C. difficile should be excluded in IBD flares as superinfection occurs in 5-10% of cases and requires different treatment."}
    ]
}

# PATIENT 25: Tanya Rodriguez - Mitral Valve Prolapse + Dysautonomia
tanya = {
    "name": "Tanya Rodriguez",
    "time": "09:45",
    "narrative": "Random palpitations that take her breath away, sharp chest pain on the left side, dizziness when standing up quickly.",
    "risk_profile": {"factors": [
        {"category": "Cardiovascular", "factor": "Mitral Valve Prolapse", "description": "Known MVP with new onset of palpitations and chest pain suggesting progression or dysautonomia comorbidity.", "severity": "Elevated", "weight": 72},
        {"category": "Autonomic", "factor": "Dysautonomia Comorbidity", "description": "Very erratic RHR pattern with orthostatic symptoms suggests autonomic dysfunction co-occurring with MVP.", "severity": "High", "weight": 78},
        {"category": "Cardiovascular", "factor": "Palpitation Episodes", "description": "RHR spikes to 95-100 bpm with intermittent drops to 60 bpm — classic MVP dysautonomia fluctuation.", "severity": "Elevated", "weight": 68},
        {"category": "Respiratory", "factor": "Episodic Desaturation", "description": "Mild SpO2 dips during palpitation episodes from reduced cardiac output efficiency.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 30, "noise": 8, "spikes": {1: (15, "erratic"), 3: (18, "erratic"), 5: (12, "erratic")}},
        "rhr": {"base": 72, "noise": 10, "spikes": {1: (98, "palpitation_spike"), 3: (95, "palpitation_spike"), 5: (100, "palpitation_spike")}},
        "temp": {"base": 0.05, "noise": 0.08},
        "rr": {"base": 15, "noise": 0.5, "spikes": {1: (18, "dyspnea"), 5: (19, "dyspnea")}},
        "walk": {"base": 1.2, "noise": 0.2},
        "steps": {"base": 7000, "noise": 600, "spikes": {1: (4000, "episode_limitation"), 5: (3500, "episode_limitation")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {1: (4, "palpitation_waking"), 3: (3, "palpitation_waking"), 5: (4, "palpitation_waking")}},
        "spo2": {"base": 96.5, "noise": 0.4, "spikes": {1: (94.5, "episode_dip"), 5: (94.8, "episode_dip")}},
        "step_len": {"base": 0.70, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 3, "trend": 0},
        "walk": {"base": 1.1, "noise": 0.1, "trend": 0},
        "spo2": {"base": 96.8, "noise": 0.3},
        "step_len": {"base": 0.70, "noise": 0.01},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Ovulatory", "Ovulatory", "Luteal", "Luteal", "Luteal", "Luteal", "Menstrual"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Highly erratic heart rate pattern with RHR swinging between 60-100 bpm and HRV oscillating 12-38ms — characteristic of MVP-dysautonomia syndrome. SpO2 dipping to 94.5% during palpitation episodes confirms hemodynamic compromise. Episodic nature with 3 discrete events in 7 days suggests paroxysmal autonomic dysfunction.",
        "key_symptoms": ["Paroxysmal palpitations — sudden onset without provocation", "Sharp left-sided chest pain during palpitation episodes", "Orthostatic dizziness — lightheadedness upon standing", "SpO2 desaturation during symptomatic episodes", "Post-episode fatigue and malaise"],
        "severity_assessment": "Moderate",
        "recommended_actions": ["Echocardiogram to assess MVP severity and mitral regurgitation", "14-day event monitor to capture paroxysmal rhythm disturbances", "Orthostatic vitals with active standing test", "Beta-blocker trial for symptom control of palpitations"],
        "cited_sources": ["PMC8678012: MVP-Dysautonomia Syndrome: Wearable Characterization", "PMC7567012: Heart Rate Variability in Mitral Valve Prolapse", "PMC6456012: Autonomic Dysfunction Comorbidity in MVP"],
        "guiding_questions": ["Do the palpitations occur at rest or with activity?", "Have you ever been diagnosed with a heart murmur or valve problem?", "Do you experience lightheadedness when standing up quickly from sitting or lying?", "Have the episodes been increasing in frequency or severity?", "Are there any triggers you have identified — caffeine, alcohol, stress?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 88, "longitudinal_avg": 70, "delta": 18, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 18, "longitudinal_avg": 34, "delta": -16, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "down"},
        {"metric": "bloodOxygenSaturation", "acute_avg": 95.2, "longitudinal_avg": 96.8, "delta": -1.6, "unit": "%", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Mitral Valve Prolapse with Dysautonomia", "similarity_score": 0.88, "pmcid": "PMC8678012", "title": "MVP-Dysautonomia Syndrome: Wearable Characterization", "snippet": "Erratic HR swings with orthostatic symptoms and episodic SpO2 dips define the MVP-dysautonomia digital phenotype."},
        {"condition": "Supraventricular Tachycardia", "similarity_score": 0.68, "pmcid": "PMC7567012", "title": "SVT in Young Women with MVP", "snippet": "Paroxysmal tachycardia episodes in MVP patients may represent co-occurring SVT requiring electrophysiology evaluation."},
        {"condition": "Panic Disorder", "similarity_score": 0.52, "pmcid": "PMC6456012", "title": "Cardiac vs Psychiatric Palpitations", "snippet": "Panic-related palpitations lack the SpO2 desaturation pattern seen in structural cardiac disease."}
    ]
}

# PATIENT 26: Grace Kim - Ovarian Cancer Screening (BRCA1 Carrier)
grace = {
    "name": "Grace Kim",
    "time": "11:15",
    "narrative": "Vague pelvic pressure and bloating for 3 months, early satiety, increased urinary frequency. BRCA1 positive on genetic screening.",
    "risk_profile": {"factors": [
        {"category": "Oncological", "factor": "BRCA1 Mutation Carrier", "description": "BRCA1 positive with 40-60% lifetime risk of ovarian cancer — requires heightened surveillance.", "severity": "High", "weight": 92},
        {"category": "Gastrointestinal", "factor": "Vague GI Symptoms", "description": "Bloating with early satiety — classic ovarian cancer presenting symptoms often attributed to IBS.", "severity": "High", "weight": 78},
        {"category": "Urological", "factor": "Urinary Frequency", "description": "Increased frequency without UTI may reflect mass effect from ovarian pathology.", "severity": "Elevated", "weight": 65},
        {"category": "Inflammatory", "factor": "Subclinical Inflammatory Signal", "description": "Mild HRV depression and temperature elevation suggest immune system responding to pathological process.", "severity": "Moderate", "weight": 55},
    ]},
    "acute_config": {
        "hrv": {"base": 36, "noise": 3, "spikes": {4: (28, "mild_depression"), 5: (30, "mild_depression")}},
        "rhr": {"base": 72, "noise": 2, "spikes": {4: (76, "mild_elevation")}},
        "temp": {"base": 0.15, "noise": 0.08, "spikes": {4: (0.35, "mild_elevation"), 5: (0.30, "mild_elevation")}},
        "rr": {"base": 14.5, "noise": 0.4},
        "walk": {"base": 1.4, "noise": 0.2},
        "steps": {"base": 6500, "noise": 500, "spikes": {5: (4500, "mild_decline")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {4: (3, "nocturia")}},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.69, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.4, "spikes": {5: (24.5, "mild_elevation")}},
    },
    "long_config": {
        "rhr": {"base": 70, "noise": 1.5, "trend": 0.05},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.5, "noise": 0.2},
        "step_len": {"base": 0.70, "noise": 0.01},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Irregular", "Irregular", "Irregular", "Perimenopause", "Perimenopause", "Irregular", "Irregular"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Subtle biometric changes with mild HRV depression and temperature elevation over recent days, in context of BRCA1 carrier status and 3-month history of vague pelvic pressure, bloating, and early satiety. These non-specific symptoms are the most common presenting complaints of ovarian cancer and demand urgent investigation given genetic risk.",
        "key_symptoms": ["Persistent pelvic pressure and bloating for 3 months", "Early satiety — unable to finish normal-sized meals", "Increased urinary frequency without infection", "BRCA1 mutation carrier status", "Mild fatigue with subtle biometric changes"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Urgent transvaginal ultrasound with Doppler assessment", "CA-125 and HE4 tumor markers with ROMA index calculation", "CT abdomen/pelvis if ultrasound suspicious", "Referral to gynecologic oncologist for high-risk management"],
        "cited_sources": ["PMC8901012: Ovarian Cancer Screening in BRCA Carriers", "PMC7890012: Subtle Digital Biomarkers Preceding Cancer Diagnosis", "PMC6789012: Vague Symptoms and Delayed Diagnosis in Ovarian Malignancy"],
        "guiding_questions": ["How long have you been experiencing the bloating, and has it been constant or intermittent?", "Have you noticed any changes in your bowel habits — constipation or changes in stool caliber?", "When were you identified as a BRCA1 carrier, and what surveillance has been recommended?", "Have you considered risk-reducing surgery, and has this been discussed with a genetics counselor?", "Is there a family history of breast or ovarian cancer — at what ages were relatives diagnosed?"]
    },
    "deltas": [
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 31, "longitudinal_avg": 38, "delta": -7, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "appleSleepingWristTemperature", "acute_avg": 0.25, "longitudinal_avg": 0.06, "delta": 0.19, "unit": "degC_deviation", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "stepCount", "acute_avg": 5500, "longitudinal_avg": 6500, "delta": -1000, "unit": "count", "clinically_significant": False, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Ovarian Cancer (BRCA1-Associated)", "similarity_score": 0.82, "pmcid": "PMC8901012", "title": "Ovarian Cancer Screening in BRCA Carriers", "snippet": "Vague pelvic symptoms lasting >3 months in BRCA1 carriers require urgent imaging — subtle biometric changes may precede clinical diagnosis."},
        {"condition": "Ovarian Borderline Tumor", "similarity_score": 0.68, "pmcid": "PMC7890012", "title": "Borderline Ovarian Tumors in High-Risk Populations", "snippet": "Borderline tumors present with similar vague symptoms but have distinct biological behavior and better prognosis."},
        {"condition": "Irritable Bowel Syndrome", "similarity_score": 0.50, "pmcid": "PMC6789012", "title": "IBS vs Ovarian Cancer: A Dangerous Misdiagnosis", "snippet": "Ovarian cancer is frequently misdiagnosed as IBS — new onset of IBS symptoms in women >40 should prompt gynecologic evaluation."}
    ]
}

# PATIENT 27: Blessing Adeyemi - Post-Preeclampsia Cardiovascular Risk
blessing = {
    "name": "Blessing Adeyemi",
    "time": "12:30",
    "narrative": "6 months postpartum after preeclampsia. Persistent headaches, fatigue, swelling in legs, blood pressure still not back to normal.",
    "risk_profile": {"factors": [
        {"category": "Cardiovascular", "factor": "Post-Preeclampsia Hypertension", "description": "Persistent BP elevation 6 months postpartum after severe preeclampsia — 4x lifetime CVD risk.", "severity": "High", "weight": 88},
        {"category": "Cardiovascular", "factor": "Sustained Tachycardia", "description": "RHR elevated 78-88 bpm indicating ongoing cardiovascular stress from persistent hypertension.", "severity": "High", "weight": 80},
        {"category": "Renal", "factor": "Proteinuria Risk", "description": "Post-preeclampsia renal injury may persist — pedal edema suggests ongoing fluid retention.", "severity": "Elevated", "weight": 72},
        {"category": "Racial", "factor": "Black Maternal Health Disparity", "description": "Black women face 3x preeclampsia mortality and higher long-term cardiovascular sequelae risk.", "severity": "High", "weight": 82},
    ]},
    "acute_config": {
        "hrv": {"base": 28, "noise": 3, "spikes": {3: (20, "depressed"), 5: (22, "depressed")}},
        "rhr": {"base": 82, "noise": 3, "spikes": {2: (88, "elevated"), 4: (86, "elevated")}},
        "temp": {"base": 0.1, "noise": 0.08},
        "rr": {"base": 16, "noise": 0.5},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 5000, "noise": 500, "spikes": {4: (3500, "fatigue_limitation")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {2: (4, "headache_waking"), 4: (4, "headache_waking")}},
        "spo2": {"base": 97.0, "noise": 0.3},
        "step_len": {"base": 0.68, "noise": 0.02},
        "dsp": {"base": 23.0, "noise": 0.4},
    },
    "long_config": {
        "rhr": {"base": 76, "noise": 2, "trend": 0.2, "spikes": {25: (None, "persistent_elevation")}},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.2, "noise": 0.2},
        "step_len": {"base": 0.69, "noise": 0.01},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": ["Postpartum", "Postpartum", "Postpartum", "Postpartum", "Postpartum", "Postpartum", "Postpartum"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Sustained RHR elevation at 82-88 bpm with longitudinal upward trend over 6 months postpartum reflects persistent cardiovascular injury from preeclampsia. HRV depressed at 20ms during symptomatic days. Pedal edema and headaches 6 months after delivery indicate the cardiovascular insult is not resolving spontaneously.",
        "key_symptoms": ["Persistent headaches 6 months postpartum", "Bilateral lower extremity edema", "Fatigue out of proportion to new parenthood demands", "Sustained elevated heart rate at rest", "Blood pressure not normalizing post-delivery"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["24-hour ambulatory blood pressure monitoring", "Comprehensive metabolic panel with urine protein/creatinine ratio", "Echocardiogram to assess for peripartum cardiomyopathy", "Cardiology referral for long-term cardiovascular risk stratification"],
        "cited_sources": ["PMC8789123: Post-Preeclampsia Cardiovascular Risk in Black Women", "PMC7678123: Wearable Monitoring of Postpartum Cardiovascular Recovery", "PMC6567123: Long-Term Renal Outcomes After Preeclampsia"],
        "guiding_questions": ["How severe was the preeclampsia — were you hospitalized, and at what gestational age?", "Are you currently taking any blood pressure medications prescribed after delivery?", "Have you noticed the leg swelling worsening at the end of the day?", "Were your kidneys affected during the preeclampsia — elevated creatinine or proteinuria?", "Is there a family history of preeclampsia, hypertension, or heart disease?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 84, "longitudinal_avg": 78, "delta": 6, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 24, "longitudinal_avg": 33, "delta": -9, "unit": "ms", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 3.4, "longitudinal_avg": 1.8, "delta": 1.6, "unit": "count", "clinically_significant": True, "changepoint_detected": False, "changepoint_date": None, "changepoint_direction": None},
    ],
    "conditions": [
        {"condition": "Post-Preeclampsia Cardiovascular Syndrome", "similarity_score": 0.89, "pmcid": "PMC8789123", "title": "Post-Preeclampsia Cardiovascular Risk in Black Women", "snippet": "Persistent hypertension and tachycardia 6 months postpartum indicate failed cardiovascular recovery and elevated lifetime CVD risk."},
        {"condition": "Peripartum Cardiomyopathy", "similarity_score": 0.68, "pmcid": "PMC7678123", "title": "PPCM vs Hypertensive Heart Disease Postpartum", "snippet": "Persistent symptoms with LV dysfunction should prompt echocardiography to differentiate PPCM from hypertensive heart disease."},
        {"condition": "Chronic Kidney Disease (Post-Preeclampsia)", "similarity_score": 0.55, "pmcid": "PMC6567123", "title": "Renal Sequelae of Preeclampsia", "snippet": "Preeclampsia survivors have 4-5x increased risk of CKD; persistent proteinuria requires nephrology follow-up."}
    ]
}

# PATIENT 28: Latoya Freeman - Uterine Fibroids (Symptomatic, Large Burden)
latoya = {
    "name": "Latoya Freeman",
    "time": "13:45",
    "narrative": "Extremely heavy periods lasting 10+ days, pelvic fullness and pressure, urinating every hour, exhausted all the time.",
    "risk_profile": {"factors": [
        {"category": "Reproductive", "factor": "Large Fibroid Burden", "description": "Multiple fibroids with dominant 8cm intramural fibroid causing mass effect symptoms.", "severity": "High", "weight": 88},
        {"category": "Hematological", "factor": "Menorrhagia-Induced Anemia", "description": "10+ day heavy periods with compensatory tachycardia (RHR 82-92 bpm) indicating significant blood loss.", "severity": "High", "weight": 85},
        {"category": "Urological", "factor": "Bladder Compression", "description": "Hourly urination from anterior fibroid compressing bladder capacity.", "severity": "Elevated", "weight": 68},
        {"category": "Racial", "factor": "Fibroid Disparity", "description": "Black women develop fibroids 2-3x more frequently and at younger ages with greater symptom severity.", "severity": "High", "weight": 78},
    ]},
    "acute_config": {
        "hrv": {"base": 26, "noise": 3, "spikes": {2: (18, "crashed"), 3: (16, "crashed"), 4: (19, "crashed")}},
        "rhr": {"base": 85, "noise": 3, "spikes": {2: (92, "compensatory_tachy"), 3: (94, "compensatory_tachy"), 4: (90, "compensatory_tachy")}},
        "temp": {"base": 0.2, "noise": 0.1},
        "rr": {"base": 16, "noise": 0.5, "spikes": {3: (19, "elevated")}},
        "walk": {"base": 2.0, "noise": 0.3, "spikes": {3: (3.5, "guarding_detected")}},
        "steps": {"base": 4500, "noise": 400, "spikes": {2: (2500, "fatigue_drop"), 3: (2000, "fatigue_drop"), 4: (2800, "fatigue_drop")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {1: (5, "nocturia"), 2: (5, "nocturia"), 3: (6, "bleeding_disruption"), 4: (5, "nocturia")}},
        "spo2": {"base": 94.0, "noise": 0.5, "spikes": {3: (92.0, "anemia_related")}},
        "step_len": {"base": 0.66, "noise": 0.02, "spikes": {3: (0.60, "shortened_stride")}},
        "dsp": {"base": 25.0, "noise": 0.5, "spikes": {3: (29.0, "pressure_guarding"), 4: (28.0, "pressure_guarding")}},
    },
    "long_config": {
        "rhr": {"base": 75, "noise": 2, "trend": 0.4, "spikes": {25: (None, "creeping_elevation")}},
        "walk": {"base": 1.8, "noise": 0.15, "trend": 0.01},
        "spo2": {"base": 95.0, "noise": 0.4, "trend": -0.08},
        "step_len": {"base": 0.68, "noise": 0.02},
        "dsp": {"base": 24.0, "noise": 0.4, "trend": 0.04},
    },
    "menstrual_phases": ["Menstrual", "Menstrual", "Menstrual", "Menstrual", "Menstrual", "Late_Menstrual", "Follicular"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Severe menorrhagia signature: HRV crashing to 16ms with RHR spiking to 94 bpm during heaviest bleeding days. SpO2 dipping to 92% confirms significant anemia. Longitudinal data shows RHR trending upward and SpO2 trending downward over 6 months — the body progressively decompensating from chronic blood loss. DSP elevated to 29% from pelvic mass pressure.",
        "key_symptoms": ["Menorrhagia — periods lasting 10+ days with heavy flow", "Pelvic fullness and pressure from large fibroid burden", "Urinary frequency — voiding every hour from bladder compression", "Extreme fatigue with compensatory tachycardia", "SpO2 dropping during menstrual phase — active hemorrhagic anemia"],
        "severity_assessment": "Moderate to High",
        "recommended_actions": ["Stat CBC with iron studies and ferritin", "Pelvic MRI for fibroid mapping and surgical planning", "IV iron infusion if hemoglobin <9 g/dL", "Gynecology referral for myomectomy or UAE evaluation"],
        "cited_sources": ["PMC8901234: Fibroid Burden and Anemia in Black Women", "PMC7890234: Wearable SpO2 Decline as Anemia Progression Marker", "PMC6789234: Racial Disparities in Fibroid Treatment Access"],
        "guiding_questions": ["How many pads or tampons do you use on your heaviest day?", "Are you passing blood clots, and if so, how large?", "How has the urinary frequency affected your daily life and sleep?", "Have you been told your hemoglobin is low, and have you tried iron supplements?", "What treatments have been discussed with you — medication, procedures, surgery?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 90, "longitudinal_avg": 80, "delta": 10, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "bloodOxygenSaturation", "acute_avg": 93.0, "longitudinal_avg": 95.0, "delta": -2.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 18, "longitudinal_avg": 30, "delta": -12, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 5.2, "longitudinal_avg": 2.0, "delta": 3.2, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Uterine Fibroids with Severe Menorrhagia", "similarity_score": 0.92, "pmcid": "PMC8901234", "title": "Fibroid Burden and Anemia in Black Women", "snippet": "Large fibroid burden with compensatory tachycardia and SpO2 decline over months confirms progressive menorrhagia-induced anemia."},
        {"condition": "Adenomyosis", "similarity_score": 0.74, "pmcid": "PMC7890234", "title": "Adenomyosis vs Fibroids: MRI Differentiation", "snippet": "Adenomyosis can coexist with fibroids and contribute to menorrhagia; MRI distinguishes the two pathologies."},
        {"condition": "Endometrial Hyperplasia", "similarity_score": 0.58, "pmcid": "PMC6789234", "title": "Endometrial Pathology in Heavy Uterine Bleeding", "snippet": "Prolonged heavy bleeding may cause or result from endometrial hyperplasia — endometrial biopsy indicated."}
    ]
}

# PATIENT 29: Devon Hayes - Chronic Fatigue Syndrome / ME
devon = {
    "name": "Devon Hayes",
    "time": "14:15",
    "narrative": "Crushing fatigue that worsens with any activity, cannot stand for more than 10 minutes, sleep is broken and unrefreshing.",
    "risk_profile": {"factors": [
        {"category": "Neurological", "factor": "Myalgic Encephalomyelitis / CFS", "description": "Post-exertional malaise with orthostatic intolerance meeting ICC diagnostic criteria.", "severity": "High", "weight": 85},
        {"category": "Autonomic", "factor": "Severe Autonomic Dysfunction", "description": "Very low HRV with orthostatic intolerance indicates profound autonomic nervous system dysregulation.", "severity": "High", "weight": 82},
        {"category": "Sleep", "factor": "Non-Restorative Sleep Pattern", "description": "Severe sleep fragmentation with no improvement in fatigue despite extended time in bed.", "severity": "High", "weight": 78},
        {"category": "Functional", "factor": "Severe Functional Impairment", "description": "Step count at floor level — unable to sustain meaningful physical activity.", "severity": "High", "weight": 80},
    ]},
    "acute_config": {
        "hrv": {"base": 18, "noise": 3, "spikes": {2: (12, "crashed"), 3: (10, "crashed"), 5: (13, "crashed")}},
        "rhr": {"base": 78, "noise": 3, "spikes": {2: (85, "post_exertional"), 3: (88, "post_exertional")}},
        "temp": {"base": 0.1, "noise": 0.1},
        "rr": {"base": 15, "noise": 0.5},
        "walk": {"base": 1.5, "noise": 0.2},
        "steps": {"base": 2000, "noise": 300, "spikes": {2: (600, "PEM_crash"), 3: (400, "PEM_crash"), 5: (800, "PEM_crash")}},
        "sleep": {"base": 3, "noise": 1, "spikes": {0: (5, "unrefreshing"), 1: (5, "unrefreshing"), 2: (6, "unrefreshing"), 3: (7, "unrefreshing"), 4: (6, "unrefreshing"), 5: (6, "unrefreshing"), 6: (5, "unrefreshing")}},
        "spo2": {"base": 97.0, "noise": 0.3, "spikes": {3: (95.5, "orthostatic_dip")}},
        "step_len": {"base": 0.58, "noise": 0.03, "spikes": {2: (0.48, "very_shortened"), 3: (0.45, "very_shortened")}},
        "dsp": {"base": 28.0, "noise": 0.6, "spikes": {2: (33.0, "instability"), 3: (34.5, "instability")}},
    },
    "long_config": {
        "rhr": {"base": 74, "noise": 2, "trend": 0.1},
        "walk": {"base": 1.3, "noise": 0.1, "trend": 0},
        "spo2": {"base": 97.2, "noise": 0.3},
        "step_len": {"base": 0.60, "noise": 0.02, "trend": -0.002},
        "dsp": {"base": 27.0, "noise": 0.5, "trend": 0.04},
    },
    "menstrual_phases": ["Follicular", "Follicular", "Follicular", "Ovulatory", "Luteal", "Luteal", "Luteal"],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Profound post-exertional malaise captured digitally: step count crashes to 400 following even minimal activity, with HRV collapsing to 10ms during PEM episodes. Sleep fragmented across all 7 days (5-7 awakenings nightly) yet completely unrefreshing. DSP reaching 34.5% during crashes indicates severe functional impairment consistent with moderate-severe ME/CFS.",
        "key_symptoms": ["Post-exertional malaise — symptoms worsen 24-72 hours after minimal activity", "Orthostatic intolerance — cannot stand >10 minutes", "Non-restorative sleep despite extended time in bed", "Crushing fatigue unrelieved by rest", "Cognitive dysfunction — difficulty with concentration and memory"],
        "severity_assessment": "High",
        "recommended_actions": ["ME/CFS specialist evaluation using ICC criteria", "Tilt table test for orthostatic intolerance characterization", "Activity pacing program — avoid push-crash cycle", "Screen for comorbid conditions: POTS, mast cell activation, sleep disorders"],
        "cited_sources": ["PMC8234012: Digital Phenotyping of Post-Exertional Malaise in ME/CFS", "PMC7123012: Wearable Activity Monitoring in Chronic Fatigue Syndrome", "PMC6012890: Autonomic Dysfunction in ME/CFS: HRV Biomarkers"],
        "guiding_questions": ["Does minimal activity — like a short walk or shower — trigger a crash 24-48 hours later?", "Can you describe what a crash feels like and how long it lasts?", "Are you able to stand for prolonged periods, or do you need to sit or lie down frequently?", "When did the fatigue begin — was there a triggering illness or event?", "Have you been tested for other conditions that cause fatigue — thyroid, anemia, autoimmune?"]
    },
    "deltas": [
        {"metric": "stepCount", "acute_avg": 600, "longitudinal_avg": 2200, "delta": -1600, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 12, "longitudinal_avg": 22, "delta": -10, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "walkingDoubleSupportPercentage", "acute_avg": 33.5, "longitudinal_avg": 27.5, "delta": 6.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "sleepAnalysis_awakeSegments", "acute_avg": 5.7, "longitudinal_avg": 3.0, "delta": 2.7, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-04", "changepoint_direction": "up"},
    ],
    "conditions": [
        {"condition": "Myalgic Encephalomyelitis / Chronic Fatigue Syndrome", "similarity_score": 0.93, "pmcid": "PMC8234012", "title": "Digital Phenotyping of Post-Exertional Malaise in ME/CFS", "snippet": "Step count crash to <500 following activity with HRV collapse is the hallmark digital PEM signature in ME/CFS."},
        {"condition": "Postural Orthostatic Tachycardia Syndrome", "similarity_score": 0.75, "pmcid": "PMC7123012", "title": "POTS Comorbidity in ME/CFS", "snippet": "Orthostatic intolerance with RHR elevation >30 bpm on standing occurs in 40-70% of ME/CFS patients."},
        {"condition": "Fibromyalgia", "similarity_score": 0.60, "pmcid": "PMC6012890", "title": "ME/CFS vs Fibromyalgia: Digital Differentiation", "snippet": "PEM distinguishes ME/CFS from fibromyalgia — fibromyalgia patients tolerate graded exercise better."}
    ]
}

# PATIENT 30: Kwame Asante - Obstructive Hypertrophic Cardiomyopathy
kwame = {
    "name": "Kwame Asante",
    "time": "15:45",
    "narrative": "Chest pain with exertion, two fainting episodes during pickup basketball, shortness of breath that has worsened, father died suddenly at 45.",
    "risk_profile": {"factors": [
        {"category": "Cardiovascular", "factor": "Hypertrophic Cardiomyopathy", "description": "Exertional syncope and chest pain with family history of sudden cardiac death strongly suggest HCM.", "severity": "High", "weight": 95},
        {"category": "Genetic", "factor": "Family History of Sudden Cardiac Death", "description": "Father's sudden death at age 45 is a red flag for inherited cardiomyopathy.", "severity": "High", "weight": 92},
        {"category": "Cardiovascular", "factor": "Dynamic Outflow Obstruction", "description": "Very erratic RHR with exertional SpO2 drops suggest LVOT obstruction during activity.", "severity": "High", "weight": 88},
        {"category": "Autonomic", "factor": "Severe Autonomic Instability", "description": "Very low HRV during exertional episodes reflects cardiac electrical instability.", "severity": "High", "weight": 82},
    ]},
    "acute_config": {
        "hrv": {"base": 22, "noise": 5, "spikes": {2: (10, "crisis_crash"), 4: (8, "crisis_crash"), 6: (12, "crisis_crash")}},
        "rhr": {"base": 78, "noise": 12, "spikes": {2: (118, "exertional_spike"), 4: (125, "syncope_episode"), 6: (110, "exertional_spike")}},
        "temp": {"base": 0.05, "noise": 0.08},
        "rr": {"base": 16, "noise": 0.5, "spikes": {2: (22, "exertional_dyspnea"), 4: (24, "syncope_recovery")}},
        "walk": {"base": 1.5, "noise": 0.3},
        "steps": {"base": 6000, "noise": 500, "spikes": {2: (2000, "post_episode"), 4: (1500, "syncope_day")}},
        "sleep": {"base": 2, "noise": 1, "spikes": {2: (4, "anxiety_post_episode"), 4: (5, "anxiety_post_episode")}},
        "spo2": {"base": 96.0, "noise": 0.5, "spikes": {2: (92.5, "exertional_desaturation"), 4: (91.0, "syncope_desaturation"), 6: (93.5, "exertional_desaturation")}},
        "step_len": {"base": 0.72, "noise": 0.02, "spikes": {4: (0.62, "post_syncope")}},
        "dsp": {"base": 22.5, "noise": 0.5, "spikes": {4: (26.0, "post_syncope_instability")}},
    },
    "long_config": {
        "rhr": {"base": 74, "noise": 3, "trend": 0},
        "walk": {"base": 1.3, "noise": 0.15, "trend": 0},
        "spo2": {"base": 96.5, "noise": 0.4},
        "step_len": {"base": 0.72, "noise": 0.02},
        "dsp": {"base": 22.5, "noise": 0.3},
    },
    "menstrual_phases": [],
    "clinical_brief": {
        "primary_concern": "Routine Evaluation",
        "clinical_intake": "Patient presents for routine evaluation.",
        "summary": "Life-threatening presentation: two syncope episodes during exertion with RHR spiking to 125 bpm and SpO2 crashing to 91% during episodes. HRV collapsing to 8ms reflects severe cardiac electrical instability. Combined with family history of sudden cardiac death at 45, this pattern demands urgent evaluation for hypertrophic cardiomyopathy with obstruction.",
        "key_symptoms": ["Exertional syncope — two fainting episodes during basketball", "Chest pain with moderate exertion", "Progressive exertional dyspnea worsening over months", "SpO2 desaturation to 91% during symptomatic episodes", "Family history of sudden cardiac death (father at age 45)"],
        "severity_assessment": "High — Urgent",
        "recommended_actions": ["Urgent echocardiogram with attention to septal thickness and LVOT gradient", "12-lead ECG for LVH voltage criteria and repolarization abnormalities", "24-hour Holter for NSVT detection — sudden death risk stratification", "Immediate activity restriction until cardiac clearance obtained"],
        "cited_sources": ["PMC9567890: Wearable Detection of Hypertrophic Cardiomyopathy Risk", "PMC8456890: Sudden Cardiac Death Screening in Young Athletes", "PMC7345890: LVOT Obstruction: Digital Biomarkers During Exertion"],
        "guiding_questions": ["Describe the fainting episodes — did you have any warning signs before losing consciousness?", "Does the chest pain occur only during exertion, or also at rest?", "At what age did your father pass away, and was the cause of death determined?", "Have any other family members had unexplained heart problems or sudden death?", "Have you ever had an ECG or echocardiogram before?"]
    },
    "deltas": [
        {"metric": "restingHeartRate", "acute_avg": 110, "longitudinal_avg": 74, "delta": 36, "unit": "bpm", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "up"},
        {"metric": "heartRateVariabilitySDNN", "acute_avg": 10, "longitudinal_avg": 26, "delta": -16, "unit": "ms", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "bloodOxygenSaturation", "acute_avg": 92.5, "longitudinal_avg": 96.5, "delta": -4.0, "unit": "%", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
        {"metric": "stepCount", "acute_avg": 2500, "longitudinal_avg": 6000, "delta": -3500, "unit": "count", "clinically_significant": True, "changepoint_detected": True, "changepoint_date": "2026-03-05", "changepoint_direction": "down"},
    ],
    "conditions": [
        {"condition": "Obstructive Hypertrophic Cardiomyopathy", "similarity_score": 0.95, "pmcid": "PMC9567890", "title": "Wearable Detection of Hypertrophic Cardiomyopathy Risk", "snippet": "Exertional syncope with extreme RHR spikes, SpO2 desaturation, and family history of SCD forms the classic digital phenotype of obstructive HCM."},
        {"condition": "Arrhythmogenic Right Ventricular Cardiomyopathy", "similarity_score": 0.68, "pmcid": "PMC8456890", "title": "ARVC vs HCM: Exertional Syncope Differentiation", "snippet": "ARVC presents with exercise-triggered ventricular arrhythmias; MRI with late gadolinium enhancement differentiates from HCM."},
        {"condition": "Long QT Syndrome", "similarity_score": 0.55, "pmcid": "PMC7345890", "title": "Inherited Arrhythmia Syndromes: Sudden Death Risk", "snippet": "Exercise-triggered syncope with family SCD history should prompt ECG evaluation for prolonged QTc interval."}
    ]
}

patients_list = [amara, maria, jordan, david, elijah, priya,
                 zoe, aaliyah, fatima, naomi, sofia, kezia,
                 renata, yasmin, camille, imani, beatrice, chidinma,
                 adaeze, saoirse, maya, lena, marcus, aisha,
                 tanya, grace, blessing, latoya, devon, kwame]

def seed_db():
    print("Clearing old appointments and patients...")
    db.appointments.delete_many({})
    db.patients.delete_many({})

    # Mock analyze pipeline imports
    import asyncio
    from app.services.embeddings import load_embedding_model
    from app.services.analysis_pipeline import analyze_patient_pipeline
    from app.models.patient import PatientPayload, RiskProfile, RiskFactor

    print("Loading embedding model for dynamic condition matching...")
    embedding_model = load_embedding_model()

    async def _process_mock_patients():
        for pt in patients_list:
            p_record, a_record = create_patient_and_appointment(pt)

            try:
                # Build a real PatientPayload to run through the pipeline
                payload_dict = {
                    "patient_id": p_record["id"],
                    "patient_narrative": pt["narrative"],
                    "risk_profile": pt.get("risk_profile"),
                    "sync_timestamp": "2026-03-05T12:00:00Z",
                    "hardware_source": "apple_watch",
                    "data": {
                        "acute_7_day": {
                            "granularity": "daily",
                            "metrics": {
                                "restingHeartRate": [],
                                "heartRateVariabilitySDNN": [],
                                "appleSleepingWristTemperature": [],
                                "respiratoryRate": [],
                                "walkingAsymmetryPercentage": [],
                                "stepCount": [],
                                "sleepAnalysis_awakeSegments": [],
                                "bloodOxygenSaturation": [],
                                "walkingStepLength": [],
                                "walkingDoubleSupportPercentage": [],
                            }
                        },
                        "longitudinal_6_month": {
                            "granularity": "monthly",
                            "metrics": {
                                "restingHeartRate": [],
                                "walkingAsymmetryPercentage": [],
                                "bloodOxygenSaturation": [],
                                "walkingStepLength": [],
                                "walkingDoubleSupportPercentage": [],
                            }
                        }
                    }
                }
                payload = PatientPayload(**payload_dict)

                print(f"Running vector search for {pt['name']}...")
                # Run the actual pipeline (this will fetch conditions + LLM brief)
                analysis_response = await analyze_patient_pipeline(
                    payload, db.client, embedding_model, skip_llm=True
                )

                # Overwrite the pipeline's generated brief/deltas with the hand-crafted mock ones
                # We do this so the dashboard still displays the carefully crafted mock data,
                # but uses the dynamically fetched condition_matches.
                analysis_dict = analysis_response.model_dump()
                analysis_dict["clinical_brief"] = pt["clinical_brief"]
                analysis_dict["biometric_deltas"] = pt["deltas"]

                a_record["analysis_result"] = analysis_dict

            except Exception as e:
                print(f"Error analyzing {pt['name']}: {e}")
                
            db.patients.insert_one(p_record)
            db.appointments.insert_one(a_record)
            print(f"Inserted: {pt['name']} for {pt['time']}")

    asyncio.run(_process_mock_patients())

    print(f"Database seeded successfully with {len(patients_list)} mock patients.")

if __name__ == "__main__":
    seed_db()
