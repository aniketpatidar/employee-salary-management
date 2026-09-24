"""Area: matched against a list of known Mumbai localities, tolerating small typos."""

import csv
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import cache
from pathlib import Path

LOCALITIES_CSV = Path(__file__).resolve().parent.parent / "data" / "localities.csv"

FUZZY_THRESHOLD = 0.85
# Short names like "Khar" or "Sion" are one typo away from unrelated words, so they must match exactly.
MIN_FUZZY_LENGTH = 5

WORD = re.compile(r"[A-Za-z]+")
# Words only form one phrase when nothing but spaces or a hyphen separates them in the original text.
JOINER = re.compile(r"[\s-]+")


@dataclass(frozen=True)
class Locality:
    name: str
    pin_codes: frozenset


@dataclass(frozen=True)
class Match:
    start: int
    end: int
    phrase: str
    locality: Locality
    score: float


class Gazetteer:
    def __init__(self, localities):
        self._by_key = {loc.name.lower(): loc for loc in localities}
        self.max_words = max(len(key.split()) for key in self._by_key)

    @classmethod
    def load(cls, path=LOCALITIES_CSV):
        with open(path, newline="") as f:
            return cls(
                Locality(row["locality"], frozenset(row["pin_codes"].split()))
                for row in csv.DictReader(f)
            )

    def __iter__(self):
        return iter(self._by_key.values())

    def lookup(self, phrase):
        """Return (locality, score) for the closest known locality, or None."""
        key = phrase.lower()
        if key in self._by_key:
            return self._by_key[key], 1.0
        if len(key) < MIN_FUZZY_LENGTH:
            return None
        score, best = max((SequenceMatcher(None, key, k).ratio(), k) for k in self._by_key)
        return (self._by_key[best], score) if score >= FUZZY_THRESHOLD else None


@cache
def default_gazetteer():
    return Gazetteer.load()


def find_localities(ws, gazetteer):
    """All non-overlapping locality mentions, best matches winning ties for the same text."""
    words = list(WORD.finditer(ws.available()))
    candidates = []
    for n in range(gazetteer.max_words, 0, -1):
        for i in range(len(words) - n + 1):
            window = words[i : i + n]
            if not all(JOINER.fullmatch(ws.text[a.end() : b.start()]) for a, b in zip(window, window[1:])):
                continue
            phrase = " ".join(w.group() for w in window)
            hit = gazetteer.lookup(phrase)
            if hit:
                candidates.append(Match(window[0].start(), window[-1].end(), phrase, *hit))

    chosen = []
    for c in sorted(candidates, key=lambda c: (c.score, c.end - c.start), reverse=True):
        if all(c.end <= o.start or c.start >= o.end for o in chosen):
            chosen.append(c)
    return sorted(chosen, key=lambda c: c.start)


def extract_area(ws, result, gazetteer=None):
    matches = find_localities(ws, gazetteer or default_gazetteer())
    for m in matches:
        ws.claim(m.start, m.end)

    if not result.settle("area", [m.locality.name for m in matches]):
        return

    match = matches[0]
    locality = match.locality
    if match.score < 1:
        result.note(f"area '{match.phrase}' read as '{locality.name}'")

    pin = result.values.get("pin_code")
    if pin and pin not in locality.pin_codes:
        expected = ", ".join(sorted(locality.pin_codes))
        result.flag("pin_code", f"pincode {pin} does not match {locality.name} (expected {expected})")
