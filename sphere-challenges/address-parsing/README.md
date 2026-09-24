# Address parsing (Sphere technical challenge 1)

Breaks hand-typed CRM addresses into building name, street, area, city and pin code, plus flat, wing, floor and landmark. It flags the addresses it cannot trust instead of guessing.

> [!NOTE]
> Work in progress. The parser is complete; the answers to the brief's README questions are still to be written.

## Run it

Needs Python 3.9+ and nothing else.

```
cd sphere-challenges/address-parsing
python3 parse_addresses.py            # reads data/addresses.csv, writes output/parsed_addresses.csv
python3 -m unittest                   # tests
```

`--input` and `--output` override the default paths.

## Output columns

| Column | Meaning |
| --- | --- |
| `building_name`, `street`, `area`, `city`, `pin_code` | The five fields the brief asks for. Blank when the address does not contain them; nothing is inferred. |
| `flat`, `wing`, `floor`, `landmark` | Extra fields: what a cleaner needs to find the door once at the building |
| `flagged` | `yes` when a required field is missing or a value is unreliable |
| `flag_reasons` | What is missing or unreliable, e.g. `pincode missing`, `pincode 400009 does not match Lower Parel (expected 400013)` |
| `notes` | Judgement calls that did not need a flag, e.g. `area 'cuff parade' read as 'Cuffe Parade'` |
| `unparsed_text` | Text no stage explained |

## How it works

An address is a hierarchy (city > pin > area > street > building > wing/floor/flat) typed in any order. So the parser classifies pieces of text instead of reading left to right.

It runs a fixed list of stages (`address_parser/pipeline.py`), most certain first. Each stage claims the text it explains, so later, fuzzier stages have less left to guess about:

1. **Pin code**: six digits, plus the `Mumbai-71` shorthand for 400071.
2. **City**: Mumbai / Bombay.
3. **Area**: matched against `data/localities.csv`, tolerating small typos (similarity ≥ 0.85, exact match for names under 5 letters). The pin is then cross-checked against the area's known pins.
4. **Landmarks**: from "Opp", "Near", "Nr", "next to" or "Landmark:" up to the next separator. Taken out early so "Opp Harbour View" is not read as the building.
5. **Building number**: "Building No. 6", "Bldg no. 31".
6. **Flat, wing, floor**: labelled flats first ("Flat no.57"), then wing words ("k wing", "B Tower"), floors ("3 rd flo"), wing and flat written together ("B-4702", "A1203"), lone capital letters ("Crest Tower.A"), and finally a bare number when nothing else was found.
7. **Named building**: up to three words ending in a marker like Tower, Apartment, CHS or Heights.
8. **Street**: a name ending in Road, Lane, St, Marg, Gali and so on. Buildings come before streets in these addresses, so if the building is still unknown only one word goes to the street and the words before it are left for the building. This split is a judgement call and is recorded in `notes`.
9. **Leftover building**: if no building was found yet, the first unexplained words are taken as its name (and noted).
10. **Company check**: a company name (Pvt, Ltd, Technologies...) suggests an office address mixed in.

Whenever a field turns up two different values (two pins, two flat numbers), it is left blank and flagged rather than picking one.

### The flag rule

`address_parser/flagging.py` decides. An address is flagged when:

- a **required field is blank**: building name, flat, area, city or pin code. These are what a cleaner needs to reach the door. Street is not required, since plenty of Mumbai addresses are findable from building and area alone.
- or a stage found a value it **cannot trust**: pieces that contradict each other (pin vs area), two values for one field, a label with nothing after it ("flat no"), a street word with no name, a company name.

Correcting a spelling against a known list is allowed. Filling a blank field from other evidence (say, the area from the pin) is never done. A test checks that every building, street, flat, wing, floor and landmark value appears in the original text.

## Data

- `data/addresses.csv`: the 30 addresses as supplied with the brief. The parser reads only `id` and `address`; the `difficulty` column is never used, so flags come from the text alone.
- `data/localities.csv`: a hand-compiled list of Mumbai localities and their pin codes. Treat it as a starting point: it should be checked against, or replaced by, India Post's pincode directory. Some boundaries are genuinely fuzzy. For example, Raheja Vihar is often written as "Powai" but has pin 400072, so B08 flags.

## Known limits

- When a building and a street run together with no marker word, the split can be wrong. C10 gives building "The Lighthouse Rani" and street "Tara road"; the right answer is "The Lighthouse" and "Rani Tara Road".
- Typos inside building names ("vasnt splendr") are kept as typed. There is no list of building names to correct them against.
- Sub-localities (Hiranandani, JVN Nagar, IIT Campus) are not recognised and end up in `unparsed_text` or the building name.

## Layout

```
parse_addresses.py        CLI: CSV in, CSV out
address_parser/
  pipeline.py             stage order
  workspace.py            tracks which text has been claimed
  anchors.py              pin code, city
  localities.py           area matching and pin cross-check
  landmarks.py            Opp / Near / Landmark phrases
  units.py                flat, wing, floor
  buildings.py            building number, named and leftover building, company check
  streets.py              street
  flagging.py             the flag rule
  result.py               output fields and the result model
tests/
```

To add a stage, write a `stage(workspace, result)` function and put it in `STAGES`. To make a field required, add it to `REQUIRED` in `flagging.py`.
