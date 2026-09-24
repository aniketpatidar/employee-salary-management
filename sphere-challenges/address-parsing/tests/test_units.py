import unittest

from address_parser.result import ParsedAddress
from address_parser.units import extract_units
from address_parser.workspace import Workspace


def units(text):
    ws, result = Workspace(text), ParsedAddress(text)
    extract_units(ws, result)
    return result


class UnitTest(unittest.TestCase):
    def assertUnits(self, text, **expected):
        self.assertEqual(units(text).values, expected, text)

    def test_labelled_flat_in_its_many_spellings(self):
        self.assertUnits("Flat # 214, Marigold Apartment", flat="214")
        self.assertUnits("Harbour View 1 B Tower Flat no.57", flat="57", wing="B")
        self.assertUnits("Sarita Building Flat No: 72 7th Floor", flat="72", floor="7")

    def test_flat_label_without_a_number_is_flagged(self):
        result = units("Crest Tower A 18St Floor flat no")
        self.assertNotIn("flat", result.values)
        self.assertEqual(result.issues[0].reason, "'flat no' written without a number")

    def test_wing_and_flat_written_together(self):
        self.assertUnits("B-4702 Aurora", flat="4702", wing="B")
        self.assertUnits("A/408 Everst Crys", flat="408", wing="A")
        self.assertUnits("Emerald Heights A1203", flat="1203", wing="A")
        self.assertUnits("Crest Tower.K 74", flat="74", wing="K")

    def test_digit_stays_with_the_wing_when_a_separator_follows(self):
        self.assertUnits("T2-1804 Sapphire", flat="1804", wing="T2")

    def test_wing_from_keyword_or_lone_letter(self):
        self.assertUnits("Flat no. 902 k wing raheja Horizon", flat="902", wing="K")
        self.assertUnits("Crest Tower.A 11th floor", wing="A", floor="11")

    def test_initials_and_ampersands_are_not_wings(self):
        self.assertEqual(units("R.K. Bhosle Road").values, {})
        self.assertEqual(units("K & R Sapphire isle").values, {})

    def test_floor_before_flat_so_the_floor_number_is_not_read_as_a_flat(self):
        self.assertUnits("Anjali CHS 503 5th Floor", flat="503", floor="5")
        self.assertUnits("Sea Havan 3 rd flo", floor="3")

    def test_bare_number_is_only_a_fallback(self):
        self.assertUnits("1104 Skyline Sunrise", flat="1104")
        self.assertUnits("17C Flat 22 Nalanda", flat="22")

    def test_two_flat_numbers_suggest_two_addresses(self):
        result = units("T2-1804 Sapphire C-2215-18 Silverline")
        self.assertNotIn("flat", result.values)
        self.assertIn("may be two addresses in one field", result.issues[0].reason)


if __name__ == "__main__":
    unittest.main()
