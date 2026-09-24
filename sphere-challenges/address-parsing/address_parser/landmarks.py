"""Landmarks: "Opp X", "Near Y". Pulled out early so X and Y are not mistaken for the building or street."""

import re

TRIGGER = re.compile(r"\b(?:opp(?:osite)?|near|nr|next\s+to|behind|beside|landmark)\b\.?\s*:?", re.IGNORECASE)


def extract_landmarks(ws, result):
    """A landmark runs from its trigger word to the next trigger, separator or already-claimed text."""
    found = []
    for start, end in ws.chunks():
        segment = ws.text[start:end]
        triggers = list(TRIGGER.finditer(segment))
        for trigger, following in zip(triggers, triggers[1:] + [None]):
            stop = start + (following.start() if following else len(segment))
            text = ws.text[start + trigger.start() : stop].strip(" .")
            ws.claim(start + trigger.start(), stop)
            if len(text) > len(trigger.group().strip()):
                found.append(text)
    if found:
        result.set("landmark", "; ".join(found))
