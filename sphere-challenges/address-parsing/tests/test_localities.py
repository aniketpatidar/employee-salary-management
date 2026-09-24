import unittest

from address_parser.localities import Gazetteer, Locality, extract_area
from address_parser.result import ParsedAddress
from address_parser.workspace import Workspace

GAZETTEER = Gazetteer(
    [
        Locality("Cuffe Parade", frozenset({"400005"})),
        Locality("Parel", frozenset({"400012"})),
        Locality("Lower Parel", frozenset({"400013"})),
        Locality("Goregaon West", frozenset({"400104"})),
        Locality("Khar West", frozenset({"400052"})),
        Locality("Sion", frozenset({"400022"})),
        Locality("Powai", frozenset({"400076"})),
    ]
)


def run(text, pin=None):
    ws, result = Workspace(text), ParsedAddress(text)
    if pin:
        result.set("pin_code", pin)
    extract_area(ws, result, GAZETTEER)
    return ws, result


class AreaTest(unittest.TestCase):
    def test_exact_match_is_case_insensitive_and_claimed(self):
        ws, result = run("B-4702 Aurora lower parel, Mumbai")
        self.assertEqual(result.values["area"], "Lower Parel")
        self.assertNotIn("parel", ws.available().lower())

    def test_longer_locality_wins_over_the_one_inside_it(self):
        _, result = run("Lower Parel")
        self.assertEqual(result.values["area"], "Lower Parel")
        self.assertEqual(result.issues, [])

    def test_small_typo_is_corrected_and_noted(self):
        _, result = run("Flat 214, cuff parade, Mumbai")
        self.assertEqual(result.values["area"], "Cuffe Parade")
        self.assertIn("cuff parade", result.notes[0])

    def test_short_names_need_an_exact_match(self):
        _, result = run("Sino Tower")
        self.assertNotIn("area", result.values)

    def test_words_split_by_a_comma_do_not_form_one_locality(self):
        _, result = run("Goregaon, West Wing")
        self.assertNotIn("area", result.values)

    def test_landmark_repeating_part_of_the_area_does_not_conflict(self):
        _, result = run("Nr. Goregaon Bus De Goregaon West")
        self.assertEqual(result.values["area"], "Goregaon West")
        self.assertEqual(result.issues, [])

    def test_two_different_areas_are_flagged_not_picked(self):
        _, result = run("Sapphire isle Powai, Silverline Estate, Cuffe Parade")
        self.assertNotIn("area", result.values)
        self.assertEqual(result.issues[0].reason, "more than one area (Powai, Cuffe Parade)")

    def test_pin_that_contradicts_the_area_is_flagged(self):
        _, result = run("Lower Parel", pin="400009")
        self.assertEqual(result.issues[0].field, "pin_code")
        self.assertIn("expected 400013", result.issues[0].reason)

    def test_pin_that_agrees_with_the_area_is_fine(self):
        _, result = run("Powai", pin="400076")
        self.assertEqual(result.issues, [])


class GazetteerFileTest(unittest.TestCase):
    def test_bundled_list_loads_and_every_pin_is_a_mumbai_pin(self):
        gazetteer = Gazetteer.load()
        self.assertEqual(gazetteer.lookup("Cuffe Parade")[0].pin_codes, {"400005"})
        for locality in gazetteer:
            self.assertTrue(all(p.startswith("400") and len(p) == 6 for p in locality.pin_codes), locality)


if __name__ == "__main__":
    unittest.main()
