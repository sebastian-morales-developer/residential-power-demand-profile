# State Demand Profile Viewer

Static Bootstrap application for visualizing **Average kW** demand profiles by U.S. state and month.

## Features
- State dropdown with **TX** selected by default.
- Month dropdown that only shows months whose CSV files actually exist.
- Line chart for **Average kW** versus **Timestamp (EST)**.
- Visible error message when a state folder has no valid CSV data.
- **Dark mode / Light mode** toggle button with saved preference.

## Data source structure
The app reads source files from:

```text
states_demmand_profile/
  TX/
    Timeseries_Data (1).csv
    ...
  FL/
    Timeseries_Data (1).csv
    ...
  UT/
```

Each CSV must contain:
- `Timestamp (EST)`
- `Average kW`

## Important implementation note
Because this is a static HTML application, the CSV data is precompiled into:

```text
js/appData.js
```

This avoids browser issues related to local file access when opening `index.html` directly.

## Regenerate app data after changing CSVs
Run:

```bash
python scripts/generate_app_data.py
```

That script scans `states_demmand_profile` and rewrites `js/appData.js` automatically.
