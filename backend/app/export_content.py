"""Write the shared content to frontend/src/content.json.

Run from the backend folder:  python -m app.export_content
"""
import json
from pathlib import Path

from .content import all_content

OUT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "content.json"

if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(all_content(), ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {OUT}")
