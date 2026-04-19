from __future__ import annotations

import base64
import json
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def build_tile_asset_urls() -> dict[str, str]:
    asset_urls: dict[str, str] = {}
    for tile_path in sorted((ROOT / "assets" / "tiles").glob("*.svg")):
        encoded = base64.b64encode(tile_path.read_bytes()).decode("ascii")
        asset_urls[tile_path.stem] = f"data:image/svg+xml;base64,{encoded}"
    return asset_urls


def module_source(path: str) -> str:
    source = read_text(path)
    source = re.sub(r"^import .+;\n", "", source, flags=re.MULTILINE)
    source = source.replace("export const ", "const ")
    source = source.replace("export function ", "function ")
    return source


def build_script() -> str:
    return "\n\n".join(
        [
            f"window.TILE_ASSET_URLS = {json.dumps(build_tile_asset_urls())};",
            module_source("tiles.js"),
            module_source("examples.js"),
            module_source("recognition.js"),
            module_source("scoring.js").replace("function capitalize(", "function capitalizeScore(").replace("capitalize(tile.rank)", "capitalizeScore(tile.rank)").replace("capitalize(options.seatWind)", "capitalizeScore(options.seatWind)").replace("capitalize(options.roundWind)", "capitalizeScore(options.roundWind)"),
            module_source("app.js"),
        ]
    )


def build_html() -> str:
    html = read_text("index.html")
    css = read_text("styles.css")
    script = build_script()

    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>")
    html = html.replace('<script type="module" src="app.js"></script>', f"<script>{script}</script>")
    html = html.replace('<main class="app-shell">', '<main class="app-shell streamlit-embedded">')
    return html


st.set_page_config(
    page_title="Derek's Mahjong Scorer",
    page_icon=":material/casino:",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      .stApp { background: #f4f7f6; }
      [data-testid="stHeader"], [data-testid="stToolbar"] { display: none; }
      .block-container { padding: 0; max-width: none; }
      iframe { display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(build_html(), height=1800, scrolling=True)
