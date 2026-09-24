"""The single place that decides whether an address is flagged, and says why."""

from .result import LABELS

# Without these a cleaner cannot reach the door, so a blank one flags the address.
# Street is not here: plenty of Mumbai addresses are findable from building and area alone.
REQUIRED = ("building_name", "flat", "area", "city", "pin_code")


def flag_reasons(result):
    """Everything wrong with this address. An empty list means it parsed cleanly."""
    troubled = {issue.field for issue in result.issues}
    missing = [
        f"{LABELS[name]} missing"
        for name in REQUIRED
        if not result.values.get(name) and name not in troubled
    ]
    return missing + [issue.reason for issue in result.issues]
