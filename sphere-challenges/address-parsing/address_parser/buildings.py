"""Building name, found three ways in falling order of confidence:

1. a numbered block: "Building No. 6", "Bldg no. 31"
2. a name ending in a word like Tower, Apartment or CHS: "Crest Tower", "Anjali CHS"
3. failing both, the first unexplained words left once everything else is claimed: "Harbour View 1"
"""

import re

BUILDING_NUMBER = re.compile(r"\b(?:building|bldg)\b\.?\s*no\b\.?\s*:?\s*\d{1,4}\b", re.IGNORECASE)

SUFFIXES = {
    "tower", "towers", "apartment", "apartments", "apt", "apts", "chs", "chsl", "building", "bldg",
    "heights", "residency", "estate", "complex", "society", "plaza", "enclave", "niwas", "sadan",
    "bhavan", "mansion", "villa", "house",
}
# "of a Building" is filler, not a building called "of a".
STOPWORDS = {"of", "a", "an", "the", "and", "in", "at", "on"}
MAX_NAME_WORDS = 3
TRAILING_NUMBER = re.compile(r"[\s.]*\d{1,2}\b")
JOINER = re.compile(r"[\s.-]*")

COMPANY_WORDS = r"pvt|private|ltd|limited|llp|inc|technologies|solutions"
# The company word plus the name before it and any legal suffixes after: "Brightpath Technologies Pvt Ltd".
COMPANY = re.compile(rf"(?:\w+\s+)?\b(?:{COMPANY_WORDS})\b(?:[\s.]+(?:{COMPANY_WORDS})\b)*", re.IGNORECASE)


def _key(word):
    return word.rstrip(".").lower()


def extract_building_number(ws, result):
    for m in BUILDING_NUMBER.finditer(ws.available()):
        result.set("building_number", m.group())
        ws.claim(*m.span())


def extract_named_building(ws, result):
    found = []
    for start, end in ws.chunks():
        words = ws.words(start, end)
        for i, (_, suffix_end, word) in enumerate(words):
            if _key(word) not in SUFFIXES:
                continue
            first = i
            while (
                first > 0
                and i - first < MAX_NAME_WORDS
                and _key(words[first - 1][2]) not in SUFFIXES | STOPWORDS
                and JOINER.fullmatch(ws.text[words[first - 1][1] : words[first][0]])
            ):
                first -= 1
            if first == i:
                continue
            number = TRAILING_NUMBER.match(ws.available(), suffix_end)
            name_end = number.end() if number else suffix_end
            found.append(ws.text[words[first][0] : name_end])
            ws.claim(words[first][0], name_end)
    result.settle("building_name", found)


def extract_leftover_building(ws, result):
    """Runs last. Also folds any building number into the name: "Sea Havan, Building No. 6"."""
    name = result.values.get("building_name")
    if not name and not _flagged(result, "building_name"):
        for start, end in ws.chunks():
            if re.search(r"[A-Za-z]{3}", ws.text[start:end]):
                name = ws.text[start:end]
                ws.claim(start, end)
                result.note(f"building name '{name}' has no marker word like Tower or CHS, taken from leftover text")
                break

    number = result.values.pop("building_number", None)
    building = ", ".join(part for part in (name, number) if part)
    if building:
        result.set("building_name", building)


def detect_company(ws, result):
    m = COMPANY.search(ws.text)
    if m:
        result.flag("building_name", f"mentions a company ('{m.group()}'), may be an office address rather than a home")


def _flagged(result, name):
    return any(issue.field == name for issue in result.issues)
