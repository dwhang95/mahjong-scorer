# HK Mahjong Scorer

A small dependency-free web app for manually entering and scoring a completed Hong Kong / Cantonese mahjong hand.

## Run

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Then visit `http://127.0.0.1:8000/`.

## Tests

Run the lightweight scoring test suite with Node:

```sh
node --input-type=module -e "import('./tests.js')"
```

The tests print clear `PASS` / `FAIL` lines to the console and exit with an error if any case fails.

## Streamlit Deployment

This repo also includes a Streamlit wrapper for deploying the same app to Streamlit Community Cloud.

Deploy settings:

- Repository: this GitHub repository
- Branch: `main` or your active deployment branch
- Entry point: `streamlit_app.py`
- Custom subdomain: `dereks-mahjong-scorer`

If the subdomain is available, the public URL will be:

```text
https://dereks-mahjong-scorer.streamlit.app/
```

Streamlit installs dependencies from `requirements.txt`. The wrapper embeds the existing static app and local SVG tile assets, so no secrets or external asset hosting are required.

## Current Scope

- Manual tile selection for a 14-tile winning hand
- Standard 4-meld-and-pair validation
- Seven pairs validation
- Fan breakdown with common Hong Kong style patterns
- Seat wind, round wind, self-draw, and concealed hand options
- Example hands for quick testing

Hong Kong mahjong scoring varies by table. This app uses a practical common-rules baseline with a 3 fan minimum and a 10 fan limit cap.

## Structure

- `app.js`: UI state and rendering
- `tiles.js`: tile catalog, sorting, and count helpers
- `scoring.js`: hand validation and fan scoring engine
- `examples.js`: sample hands
- `recognition.js`: input boundary for manual selection now and photo recognition later

Photo recognition can be added by implementing `createPhotoTileInput()` in `recognition.js` so it returns the same tile IDs used by manual selection.
