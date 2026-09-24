import unittest

from address_parser import flag_reasons, parse


class PipelineTest(unittest.TestCase):
    def test_clean_address_is_fully_explained_and_not_flagged(self):
        result = parse("Harbour View 1 Flat no.104 A Cuffe Parade, Mumbai 400005")
        self.assertEqual(
            result.values,
            {
                "pin_code": "400005",
                "city": "Mumbai",
                "area": "Cuffe Parade",
                "flat": "104",
                "wing": "A",
                "building_name": "Harbour View 1",
            },
        )
        self.assertEqual(flag_reasons(result), [])
        self.assertEqual(result.unparsed, "")

    def test_blank_required_fields_are_named(self):
        self.assertEqual(
            flag_reasons(parse("47, mumbai")),
            ["building name missing", "area missing", "pincode missing"],
        )

    def test_a_conflict_is_reported_instead_of_also_calling_the_field_missing(self):
        reasons = flag_reasons(parse("Flat 1, Crest Tower, Powai 400076, Worli 400018, Mumbai"))
        self.assertNotIn("pincode missing", reasons)
        self.assertTrue(any("more than one pincode" in r for r in reasons))


if __name__ == "__main__":
    unittest.main()
