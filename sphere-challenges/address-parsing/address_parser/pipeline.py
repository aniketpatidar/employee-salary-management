from .anchors import extract_city, extract_pin_code
from .buildings import detect_company, extract_building_number, extract_leftover_building, extract_named_building
from .landmarks import extract_landmarks
from .localities import extract_area
from .result import ParsedAddress
from .streets import extract_street
from .units import extract_units
from .workspace import Workspace

# Most certain first: each stage claims its text so later, fuzzier stages have less to guess about.
STAGES = (
    extract_pin_code,
    extract_city,
    extract_area,
    extract_landmarks,
    extract_building_number,
    extract_units,
    extract_named_building,
    extract_street,
    extract_leftover_building,
    detect_company,
)


def parse(raw):
    ws = Workspace(" ".join(raw.split()))
    result = ParsedAddress(raw)
    for stage in STAGES:
        stage(ws, result)
    result.unparsed = ws.leftover()
    return result
