from .anchors import extract_city, extract_pin_code
from .localities import extract_area
from .result import ParsedAddress
from .workspace import Workspace

# Most certain first: each stage claims its text so later, fuzzier stages have less to guess about.
STAGES = (extract_pin_code, extract_city, extract_area)


def parse(raw):
    ws = Workspace(" ".join(raw.split()))
    result = ParsedAddress(raw)
    for stage in STAGES:
        stage(ws, result)
    result.unparsed = ws.leftover()
    return result
