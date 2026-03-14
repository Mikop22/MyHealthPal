import json
import re
from typing import Dict, List, Optional


def strip_markdown_fences(s: str) -> str:
    s = (s or "").strip()
    if s.startswith("```"):
        lines = s.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        s = "\n".join(lines)
    return s.strip()


def _normalize_bullets(bullets: List[str], min_len: int = 3, max_len: int = 5) -> List[str]:
    bullets = [str(b).strip() for b in bullets if b]
    if len(bullets) < min_len:
        bullets.extend([""] * (min_len - len(bullets)))
    return bullets[:max_len]


def _normalize_questions(questions: List[str], max_len: int = 3) -> List[str]:
    return [str(question).strip() for question in questions if str(question).strip()][
        :max_len
    ]


def _is_refusal(raw: str) -> bool:
    """True if the model refused the request (safety/content policy)."""
    if not raw or len(raw) > 500:
        return False
    lower = raw.lower().strip()
    refusals = (
        "i'm sorry, i can't help",
        "i am sorry, i cannot help",
        "i can't help with that",
        "i cannot help with that",
        "i'm not able to",
        "i am not able to",
        "cannot assist",
        "can't assist",
        "unable to help",
        "cannot process this",
        "can't process this",
    )
    return any(r in lower for r in refusals)


def parse_translate_response(text: str) -> Optional[Dict[str, object]]:
    raw = strip_markdown_fences(text or "")
    if not raw:
        return None

    # Return a clear message when the model refused (e.g. content policy)
    if _is_refusal(raw):
        return {
            "summaryBullets": [
                "This document could not be summarized.",
                "The service declined to process it (content policy or safety).",
                "Try a different image or contact support if this persists.",
            ],
            "nutritionalSwap": "—",
            "followUpQuestions": [],
        }

    # Try JSON first (some models return JSON)
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            bullets = (
                data.get("summaryBullets")
                or data.get("summary_bullets")
                or data.get("summary")
                or []
            )
            swap = data.get("nutritionalSwap") or data.get("nutritional_swap")
            questions = (
                data.get("followUpQuestions")
                or data.get("follow_up_questions")
                or data.get("questions")
                or []
            )
            if isinstance(bullets, list) and bullets:
                return {
                    "summaryBullets": _normalize_bullets(bullets),
                    "nutritionalSwap": (str(swap).strip() if swap else "No specific swap provided."),
                    "followUpQuestions": _normalize_questions(
                        questions if isinstance(questions, list) else [questions]
                    ),
                }
    except (json.JSONDecodeError, TypeError):
        pass

    # Start from SUMMARY if present (ignore any intro line)
    summary_start = re.search(r"\bSUMMARY\s*:\s*\n", raw, re.IGNORECASE)
    if summary_start:
        raw = raw[summary_start.start() :]

    # Find section split: allow NUTRITIONAL_SWAP / Nutritional swap etc.
    swap_pattern = re.compile(
        r"\n\s*NUTRITIONAL[_\s]?SWAP\s*:\s*\n",
        re.IGNORECASE,
    )
    swap_match = swap_pattern.search(raw)
    follow_up_pattern = re.compile(
        r"\n\s*FOLLOW[_\s-]?UP[_\s]?QUESTIONS?\s*:\s*\n",
        re.IGNORECASE,
    )

    questions_text = ""
    if not swap_match:
        if "NUTRITIONAL_SWAP" in raw.upper():
            idx = raw.upper().index("NUTRITIONAL_SWAP")
            line_end = raw.index("\n", idx) if "\n" in raw[idx:] else len(raw)
            summary_text = raw[:idx].strip()
            remaining_text = raw[line_end + 1 :].strip()
        else:
            # No section headers: treat whole response as summary, extract bullets
            summary_text = raw
            remaining_text = ""
    else:
        summary_text = raw[: swap_match.start()].strip()
        remaining_text = raw[swap_match.end() :].strip()

    follow_up_match = follow_up_pattern.search(remaining_text)
    if follow_up_match:
        nutritional_swap = remaining_text[: follow_up_match.start()].strip()
        questions_text = remaining_text[follow_up_match.end() :].strip()
    else:
        nutritional_swap = remaining_text.strip() or "No specific swap provided."

    # Drop leading "SUMMARY:" or "Summary:" line
    summary_lines = summary_text.splitlines()
    if summary_lines and re.match(r"^\s*SUMMARY\s*:\s*$", summary_lines[0], re.IGNORECASE):
        summary_lines = summary_lines[1:]
    bullet_lines = [ln.strip() for ln in summary_lines if ln.strip()]

    bullets: List[str] = []
    for line in bullet_lines:
        if line.startswith("- "):
            bullet = line[2:].strip()
        elif line.startswith("* "):
            bullet = line[2:].strip()
        else:
            continue
        if bullet:
            bullets.append(bullet)

    # If no markdown bullets, use first non-empty lines as bullets (up to 3)
    if not bullets and bullet_lines:
        for line in bullet_lines[:5]:
            line = line.strip()
            if line and not re.match(r"^(SUMMARY|NUTRITIONAL|#|\*\*)\s*", line, re.IGNORECASE):
                bullets.append(line)
            if len(bullets) >= 3:
                break

    if len(bullets) < 3:
        bullets.extend([""] * (3 - len(bullets)))
    else:
        bullets = bullets[:5]

    nutritional_swap = nutritional_swap.strip()
    if not nutritional_swap:
        nutritional_swap = "No specific swap provided."

    question_lines = [ln.strip() for ln in questions_text.splitlines() if ln.strip()]
    follow_up_questions: List[str] = []
    for line in question_lines:
        if line.startswith("- "):
            question = line[2:].strip()
        elif line.startswith("* "):
            question = line[2:].strip()
        else:
            question = line.strip()
        if question:
            follow_up_questions.append(question)

    return {
        "summaryBullets": bullets,
        "nutritionalSwap": nutritional_swap,
        "followUpQuestions": _normalize_questions(follow_up_questions),
    }
