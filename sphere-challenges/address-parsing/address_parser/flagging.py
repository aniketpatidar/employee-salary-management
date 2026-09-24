"""The single place that decides whether an address is flagged, and says why."""

from .result import LABELS

# Without these the address cannot be placed on a map, so a blank one flags it.
REQUIRED = ("area", "city", "pin_code")


def flag_reasons(result):
    """Everything wrong with this address. An empty list means it parsed cleanly."""
    troubled = {issue.field for issue in result.issues}
    missing = [
        f"{LABELS[name]} missing"
        for name in REQUIRED
        if not result.values.get(name) and name not in troubled
    ]
    return missing + [issue.reason for issue in result.issues]
