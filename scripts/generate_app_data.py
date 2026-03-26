#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

MONTH_NAMES = {
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
    6: 'June',
    7: 'July',
    8: 'August',
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
}

ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = ROOT / 'states_demmand_profile'
OUTPUT_FILE = ROOT / 'js' / 'appData.js'
FILE_PATTERN = re.compile(r'Timeseries_Data \((\d+)\)\.csv$', re.IGNORECASE)
TIMESTAMP_COLUMN = 'Timestamp (EST)'
AVERAGE_KW_COLUMN = 'Average kW'


def parse_month_file(csv_path: Path, month_number: int) -> dict:
    timestamps: list[str] = []
    average_kw: list[float] = []

    with csv_path.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        if TIMESTAMP_COLUMN not in (reader.fieldnames or []):
            raise ValueError(f"Missing '{TIMESTAMP_COLUMN}' in {csv_path.name}")
        if AVERAGE_KW_COLUMN not in (reader.fieldnames or []):
            raise ValueError(f"Missing '{AVERAGE_KW_COLUMN}' in {csv_path.name}")

        for row in reader:
            timestamps.append((row.get(TIMESTAMP_COLUMN) or '').strip())
            try:
                average_kw.append(float((row.get(AVERAGE_KW_COLUMN) or '').strip()))
            except ValueError as exc:
                raise ValueError(f"Invalid Average kW value in {csv_path.name}: {row.get(AVERAGE_KW_COLUMN)!r}") from exc

    return {
        'monthNumber': month_number,
        'monthName': MONTH_NAMES.get(month_number, f'Month {month_number}'),
        'sourceFile': csv_path.name,
        'timestamps': timestamps,
        'averageKw': average_kw,
    }


def build_app_data() -> dict:
    states: dict[str, dict] = {}

    if not STATE_DIR.exists():
        return {'states': states}

    for state_path in sorted(path for path in STATE_DIR.iterdir() if path.is_dir()):
        months: dict[str, dict] = {}
        for csv_path in sorted(state_path.glob('*.csv')):
            match = FILE_PATTERN.match(csv_path.name)
            if not match:
                continue
            month_number = int(match.group(1))
            months[str(month_number)] = parse_month_file(csv_path, month_number)

        states[state_path.name] = {'months': months}

    return {'states': states}


def main() -> None:
    app_data = build_app_data()
    OUTPUT_FILE.write_text('window.APP_DATA = ' + json.dumps(app_data, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'Generated {OUTPUT_FILE}')


if __name__ == '__main__':
    main()
