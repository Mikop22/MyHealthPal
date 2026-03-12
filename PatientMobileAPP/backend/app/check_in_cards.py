import re
from typing import Iterable, List

from app.check_in_schemas import StructuredSymptom, SymptomCard


def _tokenize(values: Iterable[str]) -> set:
    tokens = set()
    for value in values:
        if not value:
            continue
        tokens.update(re.findall(r"[a-z0-9]+", value.lower()))
    return tokens


def match_symptoms_to_cards(
    extracted: List[StructuredSymptom],
    card_bank: List[SymptomCard],
    top_n: int = 10,
) -> List[SymptomCard]:
    symptom_tokens = _tokenize(
        [symptom.symptom for symptom in extracted]
        + [symptom.context or "" for symptom in extracted]
    )

    scored_cards = []
    for index, card in enumerate(card_bank):
        card_tokens = _tokenize(card.tags + [card.text, card.subtitle or ""])
        score = len(symptom_tokens & card_tokens)
        if score > 0:
            scored_cards.append((score, index, card))

    scored_cards.sort(key=lambda item: (-item[0], item[1]))
    return [card for _, _, card in scored_cards[:top_n]]
