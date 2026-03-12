from app.check_in_schemas import SymptomCard


CHECK_IN_CARD_BANK = [
    SymptomCard(
        id="chest-tight",
        text="Chest feels tight when I walk or climb stairs",
        subtitle="You notice it more with activity.",
        tags=["chest", "tightness", "walking", "climbing", "stairs", "exertion"],
    ),
    SymptomCard(
        id="short-breath",
        text="I get short of breath more easily than usual",
        subtitle="It feels harder to catch my breath.",
        tags=["breath", "breathing", "shortness", "winded", "activity"],
    ),
    SymptomCard(
        id="dizzy-meals",
        text="I feel dizzy after eating",
        subtitle=None,
        tags=["dizziness", "dizzy", "after", "eating", "meals"],
    ),
    SymptomCard(
        id="headache",
        text="I have a headache that keeps coming back",
        subtitle="The pain can come and go.",
        tags=["headache", "head", "pain", "pressure"],
    ),
    SymptomCard(
        id="light-sensitive",
        text="Bright light makes the headache feel worse",
        subtitle=None,
        tags=["light", "sensitive", "headache", "migraine"],
    ),
    SymptomCard(
        id="stomach-meals",
        text="I get stomach pain after eating",
        subtitle="You notice it around meals.",
        tags=["stomach", "pain", "after", "eating", "meals"],
    ),
    SymptomCard(
        id="nausea",
        text="I feel nauseous or sick to my stomach",
        subtitle=None,
        tags=["nausea", "nauseous", "stomach", "sick"],
    ),
    SymptomCard(
        id="bloating",
        text="My stomach feels bloated or swollen",
        subtitle=None,
        tags=["stomach", "bloating", "swollen", "fullness"],
    ),
    SymptomCard(
        id="fatigue",
        text="I feel more tired than usual",
        subtitle="The tiredness is harder to shake off.",
        tags=["tired", "fatigue", "low", "energy"],
    ),
    SymptomCard(
        id="sleep-change",
        text="My sleep has been worse lately",
        subtitle=None,
        tags=["sleep", "rest", "insomnia", "waking"],
    ),
]
