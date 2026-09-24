# Address parsing (Sphere technical challenge 1)

Breaks hand-typed CRM addresses into building name, street, area, city and pin code, and flags the ones it cannot trust instead of guessing.

> [!NOTE]
> Work in progress. Pin code, city and area are done. Landmarks, flat/wing/floor, street and building name come next, and the brief's README questions get answered once the parser is complete.

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
| `building_name`, `street`, `area`, `city`, `pin_code` | Parsed values. Blank when the address does not contain them; nothing is inferred. |
| `flagged` | `yes` when a required field is missing or a value is unreliable |
| `flag_reasons` | What is missing or unreliable, e.g. `pincode missing`, `pincode 400009 does not match Lower Parel (expected 400013)` |
| `notes` | Harmless corrections the parser made, e.g. `area 'cuff parade' read as 'Cuffe Parade'` |
| `unparsed_text` | Text no stage explained yet |

## How it works

An address is a hierarchy (city > pin > area > street > building > wing/floor/flat) typed in any order. So the parser classifies pieces of text instead of reading left to right.

It runs a fixed list of stages (`address_parser/pipeline.py`), most certain first. Each stage claims the text it explains, so later, fuzzier stages have less left to guess about:

1. **Pin code**: six digits, plus the `Mumbai-71` shorthand for 400071. Two different pins are flagged, not picked.
2. **City**: Mumbai / Bombay.
3. **Area**: matched against `data/localities.csv`, tolerating small typos (similarity ≥ 0.85, exact match for names under 5 letters). The pin is then cross-checked against the area's known pins.

Stages record problems with the values they find. The decision to flag lives in one place, `address_parser/flagging.py`, which adds any required field that came out blank.

Fixing a spelling against a known list counts as correction. Filling a blank field from other evidence (say, the area from the pin) counts as invention and is never done.

## Data

- `data/addresses.csv`: the 30 addresses as supplied with the brief. The parser reads only `id` and `address`; the `difficulty` column is never used, so flags come from the text alone.
- `data/localities.csv`: a hand-compiled list of Mumbai localities and their pin codes. Treat it as a starting point: it should be checked against, or replaced by, India Post's pincode directory. Some boundaries are genuinely fuzzy. For example, Raheja Vihar is often written as "Powai" but has pin 400072, so B08 currently flags.

## Layout

```
parse_addresses.py        CLI: CSV in, CSV out
address_parser/
  pipeline.py             stage order
  workspace.py            tracks which text has been claimed
  anchors.py              pin code, city
  localities.py           area matching and pin cross-check
  flagging.py             the flag rule
  result.py               output fields and the result model
tests/
```

To add a stage, write a `stage(workspace, result)` function and put it in `STAGES`. To make a new field required, add it to `REQUIRED` in `flagging.py`.
