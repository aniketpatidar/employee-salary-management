from dataclasses import dataclass, field

FIELDS = ("building_name", "street", "area", "city", "pin_code")

LABELS = {
    "building_name": "building name",
    "street": "street",
    "area": "area",
    "city": "city",
    "pin_code": "pincode",
}


@dataclass
class Issue:
    """A value we found but cannot trust, and why."""

    field: str
    reason: str


@dataclass
class ParsedAddress:
    raw: str
    values: dict = field(default_factory=dict)
    issues: list = field(default_factory=list)
    # Harmless corrections (e.g. a fixed typo), kept so every output value can be traced.
    notes: list = field(default_factory=list)
    # Text no stage could explain. A lot of it means the parse is probably incomplete.
    unparsed: str = ""

    def set(self, name, value):
        self.values[name] = value

    def flag(self, name, reason):
        self.issues.append(Issue(name, reason))

    def note(self, text):
        self.notes.append(text)
