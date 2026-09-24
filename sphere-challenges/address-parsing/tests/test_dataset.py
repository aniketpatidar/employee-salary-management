"""Pins down the result on the brief's 30 addresses, so a rule change that shifts them is noticed."""

import csv
import unittest
from pathlib import Path

from address_parser import flag_reasons, parse

ADDRESSES = Path(__file__).resolve().parent.parent / "data" / "addresses.csv"

EXPECTED_FLAGGED = {"A07", "A08", "A10", "B08", "B10", "C01", "C02", "C05", "C07", "C08", "C09", "C10"}


class DatasetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(ADDRESSES, newline="") as f:
            cls.results = {row["id"]: parse(row["address"]) for row in csv.DictReader(f)}

    def test_flagged_set(self):
        flagged = {id_ for id_, result in self.results.items() if flag_reasons(result)}
        self.assertEqual(flagged, EXPECTED_FLAGGED)

    def test_every_value_comes_from_the_address_itself(self):
        """Nothing invented: each value is in the text, give or take case and a corrected area or pin."""
        canonical = {"area", "city", "pin_code"}
        for id_, result in self.results.items():
            for name, value in result.values.items():
                if name in canonical:
                    continue
                for part in value.split("; ") if name == "landmark" else value.split(", "):
                    self.assertIn(part.lower(), result.raw.lower(), f"{id_} {name}")


if __name__ == "__main__":
    unittest.main()
