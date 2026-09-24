from dataclasses import dataclass, field

# The five fields the brief asks for, then the ones a cleaner needs to find the door.
FIELDS = ("building_name", "street", "area", "city", "pin_code", "flat", "wing", "floor", "landmark")

LABELS = {
    "building_name": "building name",
    "street": "street",
    "area": "area",
    "city": "city",
    "pin_code": "pincode",
    "flat": "flat number",
    "wing": "wing",
    "floor": "floor",
    "landmark": "landmark",
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

    def settle(self, name, found, hint=""):
        """Keep a value only if every mention agrees. Two different ones get flagged, never picked."""
        distinct = list(dict.fromkeys(found))
        if len(distinct) == 1:
            self.set(name, distinct[0])
            return distinct[0]
        if distinct:
            self.flag(name, f"more than one {LABELS[name]} ({', '.join(distinct)}){hint}")
        return None
