import unittest

from address_parser import parse


class LandmarkTest(unittest.TestCase):
    def test_landmark_is_kept_out_of_the_building(self):
        result = parse("Crest Tower.K 74 Opp Harbour View.3, Cuffe Parade, Mumbai 400005")
        self.assertEqual(result.values["landmark"], "Opp Harbour View.3")
        self.assertEqual(result.values["building_name"], "Crest Tower")

    def test_consecutive_landmarks_are_split(self):
        result = parse("Anjali CHS 503 Near Anand Nagar Lane Opp.Metro Mart Chembur Mumbai-71.")
        self.assertEqual(result.values["landmark"], "Near Anand Nagar Lane; Opp.Metro Mart")
        self.assertNotIn("street", result.values)


class BuildingTest(unittest.TestCase):
    def test_name_ending_in_a_marker_word(self):
        result = parse("Flat No 208 B Nirvana Apt 1 Worli")
        self.assertEqual(result.values["building_name"], "Nirvana Apt 1")

    def test_filler_before_a_marker_word_is_not_a_name(self):
        result = parse("07 3rd Floor of a Building Nova Kiran CHSL, Mahim")
        self.assertEqual(result.values["building_name"], "Nova Kiran CHSL")

    def test_unmarked_name_comes_from_leftover_text_and_is_noted(self):
        result = parse("1104 Skyline Sunrise, Andheri East")
        self.assertEqual(result.values["building_name"], "Skyline Sunrise")
        self.assertIn("no marker word", result.notes[0])

    def test_building_number_is_folded_into_the_name(self):
        result = parse("605 D wing Bldg no. 31 MHADA chandivali")
        self.assertEqual(result.values["building_name"], "MHADA, Bldg no. 31")

    def test_company_name_is_flagged(self):
        result = parse("T2-1804 Brightpath Technologies Pvt Ltd. Silverline Garden Estate")
        self.assertIn("'Brightpath Technologies Pvt Ltd'", result.issues[-1].reason)


class StreetTest(unittest.TestCase):
    def test_after_a_known_building_the_whole_phrase_is_the_street(self):
        result = parse("304-Sameer tower/ Hill crest road bandra west")
        self.assertEqual(result.values["street"], "Hill crest road")
        self.assertEqual(result.values["building_name"], "Sameer tower")

    def test_without_a_known_building_leading_words_are_left_for_it(self):
        result = parse("B-1603, Oakridge Main St., Hiranandani")
        self.assertEqual(result.values["street"], "Main St")
        self.assertEqual(result.values["building_name"], "Oakridge")
        self.assertIn("assumed 'Oakridge' is the building", result.notes[0])

    def test_street_word_with_no_name_is_flagged(self):
        result = parse("Nova Kiran CHSL Road, Mahim")
        self.assertNotIn("street", result.values)
        self.assertEqual(result.issues[0].reason, "street name missing ('Road' on its own)")


if __name__ == "__main__":
    unittest.main()
