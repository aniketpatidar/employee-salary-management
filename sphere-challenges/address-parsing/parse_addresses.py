"""Parse CRM addresses into structured fields and flag the ones that cannot be trusted."""

import argparse
import csv
from pathlib import Path

from address_parser import FIELDS, flag_reasons, parse

HERE = Path(__file__).resolve().parent
COLUMNS = ["id", "address", *FIELDS, "flagged", "flag_reasons", "notes", "unparsed_text"]


def parse_row(row):
    result = parse(row["address"])
    reasons = flag_reasons(result)
    return {
        "id": row["id"],
        "address": row["address"],
        **{name: result.values.get(name, "") for name in FIELDS},
        "flagged": "yes" if reasons else "no",
        "flag_reasons": "; ".join(reasons),
        "notes": "; ".join(result.notes),
        "unparsed_text": result.unparsed,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=HERE / "data" / "addresses.csv")
    parser.add_argument("--output", type=Path, default=HERE / "output" / "parsed_addresses.csv")
    args = parser.parse_args(argv)

    with open(args.input, newline="") as f:
        rows = [parse_row(row) for row in csv.DictReader(f)]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    flagged = sum(row["flagged"] == "yes" for row in rows)
    print(f"Parsed {len(rows)} addresses, flagged {flagged}. Wrote {args.output}")


if __name__ == "__main__":
    main()
