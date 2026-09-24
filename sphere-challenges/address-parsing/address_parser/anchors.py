"""Pin code and city: the parts of an address we can identify with near certainty."""

import re

PIN_CODE = re.compile(r"(?<!\d)[1-9]\d{5}(?!\d)")
# Staff sometimes write only the last two digits: "Mumbai-71" means 400071.
SHORT_PIN_CODE = re.compile(r"\bmumbai\s*-\s*(\d{2})(?!\d)", re.IGNORECASE)

CITY_NAMES = {"mumbai": "Mumbai", "bombay": "Mumbai"}
CITY = re.compile(r"\b(?:%s)\b" % "|".join(CITY_NAMES), re.IGNORECASE)


def extract_pin_code(ws, result):
    found = []
    for m in PIN_CODE.finditer(ws.available()):
        found.append(m.group())
        ws.claim(*m.span())
    for m in SHORT_PIN_CODE.finditer(ws.available()):
        pin = "4000" + m.group(1)
        found.append(pin)
        ws.claim(*m.span(1))
        result.note(f"pincode written as '{m.group()}', read as {pin}")

    distinct = list(dict.fromkeys(found))
    if len(distinct) == 1:
        result.set("pin_code", distinct[0])
    elif distinct:
        result.flag("pin_code", f"more than one pincode ({', '.join(distinct)})")


def extract_city(ws, result):
    found = []
    for m in CITY.finditer(ws.available()):
        found.append(CITY_NAMES[m.group().lower()])
        ws.claim(*m.span())

    distinct = list(dict.fromkeys(found))
    if len(distinct) == 1:
        result.set("city", distinct[0])
    elif distinct:
        result.flag("city", f"more than one city ({', '.join(distinct)})")
