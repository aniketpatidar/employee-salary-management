import unittest

from address_parser.anchors import extract_city, extract_pin_code
from address_parser.result import ParsedAddress
from address_parser.workspace import Workspace


def run(stage, text):
    ws, result = Workspace(text), ParsedAddress(text)
    stage(ws, result)
    return ws, result


class PinCodeTest(unittest.TestCase):
    def test_reads_six_digit_pin_and_claims_it(self):
        ws, result = run(extract_pin_code, "Cuffe Parade, Mumbai 400005.")
        self.assertEqual(result.values["pin_code"], "400005")
        self.assertNotIn("400005", ws.available())

    def test_ignores_digits_attached_to_a_longer_number(self):
        _, result = run(extract_pin_code, "Flat 1234567, Mumbai")
        self.assertNotIn("pin_code", result.values)

    def test_expands_two_digit_shorthand_and_notes_it(self):
        _, result = run(extract_pin_code, "Chembur Mumbai-71.")
        self.assertEqual(result.values["pin_code"], "400071")
        self.assertIn("Mumbai-71", result.notes[0])

    def test_dash_before_full_pin_is_not_read_as_shorthand(self):
        _, result = run(extract_pin_code, "cuff parade, Mumbai -400005")
        self.assertEqual(result.values["pin_code"], "400005")
        self.assertEqual(result.notes, [])

    def test_two_different_pins_are_flagged_not_picked(self):
        _, result = run(extract_pin_code, "Powai 400076, Worli 400018")
        self.assertNotIn("pin_code", result.values)
        self.assertIn("400076, 400018", result.issues[0].reason)

    def test_same_pin_twice_is_fine(self):
        _, result = run(extract_pin_code, "400005 Cuffe Parade 400005")
        self.assertEqual(result.values["pin_code"], "400005")
        self.assertEqual(result.issues, [])


class CityTest(unittest.TestCase):
    def test_canonicalises_case_and_old_name(self):
        self.assertEqual(run(extract_city, "47, mumbai")[1].values["city"], "Mumbai")
        self.assertEqual(run(extract_city, "Worli, Bombay")[1].values["city"], "Mumbai")

    def test_missing_city_is_left_blank(self):
        self.assertNotIn("city", run(extract_city, "Powai 400076")[1].values)


if __name__ == "__main__":
    unittest.main()
