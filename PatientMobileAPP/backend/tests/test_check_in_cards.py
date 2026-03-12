from app.check_in_cards import match_symptoms_to_cards
from app.check_in_schemas import StructuredSymptom, SymptomCard


def test_match_symptoms_to_cards_returns_card_with_matching_tags():
    extracted = [StructuredSymptom(symptom="chest tightness", context="when walking")]
    card_bank = [
        SymptomCard(
            id="chest-tight",
            text="Chest feels tight when I walk or climb stairs",
            subtitle="You notice it more with activity.",
            tags=["chest", "tightness", "walking", "exertion"],
        ),
        SymptomCard(
            id="headache",
            text="I have a headache that keeps coming back",
            subtitle=None,
            tags=["headache", "pain"],
        ),
    ]

    matched = match_symptoms_to_cards(extracted, card_bank, top_n=5)

    assert [card.id for card in matched] == ["chest-tight"]


def test_match_symptoms_to_cards_orders_by_match_strength():
    extracted = [
        StructuredSymptom(symptom="stomach pain", context="after eating"),
    ]
    card_bank = [
        SymptomCard(
            id="stomach-general",
            text="My stomach hurts",
            subtitle=None,
            tags=["stomach"],
        ),
        SymptomCard(
            id="stomach-meals",
            text="I get stomach pain after eating",
            subtitle="You notice it around meals.",
            tags=["stomach", "pain", "after", "eating", "meals"],
        ),
    ]

    matched = match_symptoms_to_cards(extracted, card_bank, top_n=5)

    assert [card.id for card in matched] == ["stomach-meals", "stomach-general"]
