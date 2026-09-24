"""Flat, wing and floor: what a cleaner needs once they are at the building.

Patterns run from most to least explicit, each claiming its text so a looser one cannot re-read it.
Numbers are flats and single letters are wings, which is how Mumbai buildings are numbered.
"""

import re

# "Flat # 214", "Flat no.57", "Flat No: 72", and "flat no" with the number missing.
FLAT = re.compile(r"\bflat\b\s*(?:no\b\.?|number\b|#)?\s*[:.]?\s*(\d{1,5})?", re.IGNORECASE)
# "k wing", "B Tower", "wing C"
WING_BEFORE_WORD = re.compile(r"(?<![\w&])([A-Za-z])\s*-?\s*(?:wing|tower)\b", re.IGNORECASE)
WING_AFTER_WORD = re.compile(r"\bwing\s*[-:]?\s*([A-Za-z])\b", re.IGNORECASE)
# "18St Floor", "3 rd flo", "11th floor"
FLOOR = re.compile(r"(?<!\w)(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:floor|flr|flo)\b", re.IGNORECASE)
# Wing and flat written together: "B-4702", "A/408", "A1203", "K 74", "T2-1804", "IC,/317"
# A digit belongs to the wing only when a separator follows it, so "A1203" is wing A, flat 1203.
WING_FLAT = re.compile(r"(?<!\w)([A-Z]{1,2}(?:\d(?=\s*,?\s*[-/]))?)(?:\s*,?\s*[-/]\s*|\s)?(\d{2,5})(?!\d)")
# A capital letter on its own, as in "Crest Tower.A" or "Flat No 208 B". Not initials ("R.K.") or "K & R".
LONE_LETTER = re.compile(r"(?<![\w&])(?<!&\s)([A-Z])(?![\w.&-])(?!\s&)")
# A plain number with no label, as in "1104 Skyline Sunrise". Only trusted when nothing better was found.
BARE_NUMBER = re.compile(r"(?<![\w./#-])(\d{2,5})(?![\w/])")


def extract_units(ws, result):
    flats, wings, floors = [], [], []

    for m in FLAT.finditer(ws.available()):
        ws.claim(*m.span())
        if m.group(1):
            flats.append(m.group(1))
        else:
            result.flag("flat", f"'{m.group().strip()}' written without a number")

    for pattern in (WING_BEFORE_WORD, WING_AFTER_WORD):
        for m in pattern.finditer(ws.available()):
            wings.append(m.group(1).upper())
            ws.claim(*m.span())

    for m in FLOOR.finditer(ws.available()):
        floors.append(m.group(1))
        ws.claim(*m.span())

    for m in WING_FLAT.finditer(ws.available()):
        wings.append(m.group(1))
        flats.append(m.group(2))
        ws.claim(*m.span())

    for m in LONE_LETTER.finditer(ws.available()):
        wings.append(m.group(1))
        ws.claim(*m.span())

    if not flats:
        for m in BARE_NUMBER.finditer(ws.available()):
            flats.append(m.group(1))
            ws.claim(*m.span())

    result.settle("flat", flats, hint=", may be two addresses in one field")
    result.settle("wing", wings)
    result.settle("floor", floors)
