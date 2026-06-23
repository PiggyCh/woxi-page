#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRIES_DIR = ROOT / "docs" / "entries"
INDEX_PATH = ROOT / "docs" / "ai-index.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Create entries and rebuild the Woxi Page AI index.")
    parser.add_argument("title", nargs="?", help="Title for a new entry.")
    parser.add_argument("tags", nargs="*", help="Optional tags for a new entry.")
    parser.add_argument("--reindex", action="store_true", help="Only rebuild docs/ai-index.json.")
    args = parser.parse_args()

    ENTRIES_DIR.mkdir(parents=True, exist_ok=True)

    if not args.reindex:
      if not args.title:
          parser.error("title is required unless --reindex is used")
      create_entry(args.title, args.tags)

    rebuild_index()


def create_entry(title: str, tags: list[str]) -> None:
    date = dt.date.today().isoformat()
    entry_id = unique_id(date, slugify(title))
    path = ENTRIES_DIR / f"{entry_id}.md"
    tag_lines = tags or ["note"]
    body = [
        "---",
        f"id: {entry_id}",
        f"title: {title}",
        f"date: {date}",
        "tags:",
        *[f"  - {tag}" for tag in tag_lines],
        "summary: ",
        "---",
        "",
        f"# {title}",
        "",
        "",
    ]
    path.write_text("\n".join(body), encoding="utf-8")
    print(f"Created docs/entries/{entry_id}.md")


def rebuild_index() -> None:
    entries = []
    for path in sorted(ENTRIES_DIR.glob("*.md")):
        markdown = path.read_text(encoding="utf-8")
        metadata = parse_front_matter(markdown)
        entry_id = str(metadata.get("id") or path.stem)
        entries.append({
            "id": entry_id,
            "title": metadata.get("title") or title_from_id(entry_id),
            "date": metadata.get("date") or entry_id[:10],
            "tags": metadata.get("tags") or [],
            "summary": metadata.get("summary") or first_paragraph(markdown),
            "path": f"entries/{path.name}",
        })

    index = {
        "site": {
            "name": "Woxi Page",
            "description": "Public personal writing, thoughts, and long-running AI-readable context.",
            "privacy": "public GitHub Pages; do not include secrets or private notes",
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        },
        "entries": entries,
    }
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    count = len(entries)
    print(f"Indexed {count} {'entry' if count == 1 else 'entries'}.")


def unique_id(date: str, slug: str) -> str:
    base = f"{date}-{slug or 'note'}"
    candidate = base
    counter = 2
    while (ENTRIES_DIR / f"{candidate}.md").exists():
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


def parse_front_matter(markdown: str) -> dict:
    match = re.match(r"^---\n([\s\S]*?)\n---", markdown)
    if not match:
        return {}

    result = {}
    lines = match.group(1).splitlines()
    index = 0
    while index < len(lines):
        pair = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", lines[index])
        if not pair:
            index += 1
            continue

        key, raw_value = pair.groups()
        if raw_value:
            result[key] = raw_value.strip()
            index += 1
            continue

        values = []
        while index + 1 < len(lines) and re.match(r"^\s+-\s+", lines[index + 1]):
            index += 1
            values.append(re.sub(r"^\s+-\s+", "", lines[index]).strip())
        result[key] = values if values else ""
        index += 1

    return result


def first_paragraph(markdown: str) -> str:
    cleaned = re.sub(r"^---\n[\s\S]*?\n---", "", markdown).strip()
    for part in re.split(r"\n\s*\n", cleaned):
        text = re.sub(r"^#+\s+", "", part.strip())
        if text:
            return text
    return ""


def title_from_id(entry_id: str) -> str:
    return " ".join(part.capitalize() for part in re.sub(r"^\d{4}-\d{2}-\d{2}-", "", entry_id).split("-"))


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"\s+", "-", value.strip())
    value = re.sub(r"-+", "-", value)
    return value[:64]


if __name__ == "__main__":
    main()
