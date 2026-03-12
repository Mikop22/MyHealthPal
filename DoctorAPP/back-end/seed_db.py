"""Seed the MongoDB medical_conditions collection with condition documents + PubMedBERT embeddings."""

import os
import sys

# Must be set before any ML imports
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Add parent dir so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services.embeddings import load_embedding_model, encode_text
from pymongo import MongoClient

# Medical conditions relevant to the diagnostic platform's focus areas
CONDITIONS = [
    {
        "condition": "Endometriosis",
        "title": "The effects of coagulation factors on the risk of endometriosis: a Mendelian randomization study",
        "pmcid": "PMC10210381",
        "snippet": "Chronic pelvic pain with acute exacerbation, elevated inflammatory markers, and mobility impairment consistent with deep infiltrating endometriosis. Patients often present with severe dysmenorrhea, dyspareunia, and cyclical pain that may become continuous. Autonomic dysregulation including elevated resting heart rate, reduced heart rate variability, and disrupted sleep architecture are commonly observed. Walking asymmetry and guarding gait patterns indicate significant pain-related mobility impairment.",
    },
    {
        "condition": "Uterine Fibroids",
        "title": "The efficacy and safety of Xuefu Zhuyu Decoction combined Mifepristone in the treatment of Uterine leiomyoma",
        "pmcid": "PMC7837943",
        "snippet": "Heavy menstrual bleeding, pelvic pressure, and pain patterns with autonomic nervous system disruption evidenced by HRV changes. Fibroids can cause bulk-related symptoms including urinary frequency, constipation, and back pain. Submucosal fibroids are associated with abnormal uterine bleeding and anemia. Patients may exhibit elevated resting heart rate due to sympathetic activation from chronic pain, along with sleep disruption and reduced daily mobility.",
    },
    {
        "condition": "Adenomyosis",
        "title": "Adenomyosis as a Risk Factor for Myometrial or Endometrial Neoplasms — Review",
        "pmcid": "PMC8872164",
        "snippet": "Diffuse uterine enlargement with severe dysmenorrhea and pelvic pain radiating to lower back. Adenomyosis involves the invasion of endometrial tissue into the myometrium, causing heavy menstrual bleeding and chronic pelvic pain. Patients frequently report worsening pain over time with progressive autonomic dysfunction including heart rate variability reduction, temperature dysregulation, and significant sleep architecture disruption.",
    },
    {
        "condition": "Pelvic Inflammatory Disease",
        "title": "Acupuncture for chronic pelvic inflammatory disease: A systematic review protocol",
        "pmcid": "PMC5895379",
        "snippet": "Acute onset pelvic pain with fever, elevated inflammatory markers, and systemic autonomic response. PID presents with lower abdominal tenderness, cervical motion tenderness, and adnexal tenderness. Patients show elevated resting heart rate, elevated wrist temperature, reduced heart rate variability indicating autonomic stress response, and significant mobility impairment with guarding behavior during ambulation.",
    },
    {
        "condition": "Ovarian Cysts",
        "title": "mTOR inhibitors and risk of ovarian cysts: a systematic review and meta-analysis",
        "pmcid": "PMC8475133",
        "snippet": "Ovarian cysts can present with acute pelvic pain, particularly during rupture or torsion. Patients may experience sudden onset of unilateral pelvic pain radiating to the back, nausea, and changes in mobility patterns. Autonomic nervous system responses include elevated heart rate, reduced HRV, and sleep disruption from pain. Large cysts may cause pressure symptoms and walking asymmetry due to pain avoidance behavior.",
    },
    {
        "condition": "Chronic Pelvic Pain Syndrome",
        "title": "The Burden of Endometriosis on Women's Lifespan: Quality of Life and Psychosocial Wellbeing",
        "pmcid": "PMC7370081",
        "snippet": "Chronic pelvic pain syndrome encompasses persistent pain in the lower abdomen lasting more than 6 months. Common features include central sensitization, autonomic dysfunction with reduced heart rate variability, elevated resting heart rate, disrupted sleep patterns with frequent awakenings, reduced step count and physical activity, and altered gait patterns. Wrist temperature deviations suggest sustained inflammatory processes.",
    },
    {
        "condition": "Endometrial Cancer",
        "title": "The Relationship between Methylation of Promoter Regions of Tumor Suppressor Genes and Endometrial Cancer",
        "pmcid": "PMC6852804",
        "snippet": "Endometrial cancer may present with abnormal uterine bleeding, pelvic pain, and systemic symptoms. Advanced disease shows autonomic dysfunction markers including persistent elevation of resting heart rate, significant HRV reduction, temperature dysregulation, progressive mobility decline reflected in step count reduction, and sleep fragmentation. Early detection is critical for improved outcomes.",
    },
    {
        "condition": "Vulvodynia",
        "title": "Psychosocial factors associated with pain and sexual function in women with Vulvodynia: A systematic review",
        "pmcid": "PMC7821117",
        "snippet": "Chronic vulvar pain without identifiable cause, lasting at least 3 months. Associated with central pain sensitization, pelvic floor dysfunction, and psychological comorbidities. Patients demonstrate autonomic dysregulation with altered heart rate variability, disrupted sleep from pain, reduced physical activity levels, and altered walking patterns. Biometric data may show sustained stress response with elevated resting heart rate.",
    },
    {
        "condition": "Interstitial Cystitis",
        "title": "The O'Leary-Sant Interstitial Cystitis Symptom Index as a treatment outcome indicator",
        "pmcid": "PMC9300131",
        "snippet": "Chronic bladder pain, urinary urgency and frequency, and pelvic pain that may worsen with bladder filling. Often coexists with endometriosis and other chronic pelvic pain conditions. Patients exhibit autonomic dysfunction markers including HRV reduction, sleep fragmentation from nocturia and pain, reduced mobility, and sustained stress response visible in elevated resting heart rate patterns.",
    },
    {
        "condition": "Polycystic Ovary Syndrome",
        "title": "Gestational diabetes mellitus incidence among women with polycystic ovary syndrome: a meta-analysis",
        "pmcid": "PMC9055740",
        "snippet": "PCOS is characterized by hyperandrogenism, ovulatory dysfunction, and polycystic ovarian morphology. Common symptoms include irregular menstruation, pelvic discomfort, and metabolic disturbances. Patients may show elevated resting heart rate due to autonomic imbalance, reduced HRV, sleep apnea-related sleep disruption, and decreased physical activity. Temperature regulation may be affected by metabolic and hormonal changes.",
    },
]


def main():
    print("Loading PubMedBERT embedding model...")
    model = load_embedding_model()

    print("Connecting to MongoDB Atlas...")
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["medical_conditions"]

    # Check if collection already has data
    existing_count = collection.count_documents({})
    if existing_count > 0:
        print(f"Collection already has {existing_count} documents. Dropping and re-seeding...")
        collection.drop()

    print(f"Generating embeddings for {len(CONDITIONS)} conditions...")
    documents = []
    for i, cond in enumerate(CONDITIONS):
        # Create embedding text from condition name + snippet
        embedding_text = f"{cond['condition']}: {cond['snippet']}"
        embedding = encode_text(model, embedding_text)

        doc = {
            "condition": cond["condition"],
            "title": cond["title"],
            "pmcid": cond["pmcid"],
            "snippet": cond["snippet"],
            "embedding": embedding,
        }
        documents.append(doc)
        print(f"  [{i+1}/{len(CONDITIONS)}] Embedded: {cond['condition']}")

    print("Inserting documents into MongoDB...")
    result = collection.insert_many(documents)
    print(f"Inserted {len(result.inserted_ids)} documents.")

    # Verify
    count = collection.count_documents({})
    print(f"Collection now has {count} documents.")
    print("\nDone! Remember to create a Vector Search index named 'vector_index' on the 'embedding' field in MongoDB Atlas.")

    client.close()


if __name__ == "__main__":
    main()
