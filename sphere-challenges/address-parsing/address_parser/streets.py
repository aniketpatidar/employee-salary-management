"""Street: a name followed by a word like Road, Lane or Marg."""

SUFFIXES = {"road", "rd", "lane", "marg", "street", "st", "gali", "path", "avenue", "highway"}
MAX_NAME_WORDS = 3


def extract_street(ws, result):
    found = []
    building_known = bool(result.values.get("building_name") or result.values.get("building_number"))
    for start, end in ws.chunks():
        words = ws.words(start, end)
        for i, (word_start, word_end, word) in enumerate(words):
            if word.rstrip(".").lower() not in SUFFIXES:
                continue
            if i == 0:
                result.flag("street", f"street name missing ('{word}' on its own)")
                break
            # Buildings come before streets. Once the building is known the whole phrase is the street;
            # otherwise only the word next to the suffix is, and the words before it are left for the building.
            first = max(0, i - MAX_NAME_WORDS) if building_known else i - 1
            if first > 0:
                building_part = ws.text[words[0][0] : words[first][0]].strip()
                result.note(f"assumed '{building_part}' is the building and the street starts after it")
            street_start = words[first][0]
            found.append(ws.text[street_start:word_end].rstrip("."))
            ws.claim(street_start, word_end)
            break
    result.settle("street", found)
