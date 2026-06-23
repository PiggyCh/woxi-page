# Woxi Page

A public GitHub Pages writing repository for thoughts, notes, and long-running context.

## Public model

This repository is intended to be public.

GitHub Pages makes the site reachable on the web. Do not write secrets, credentials, private personal data, or anything that should not be public.

AI tools can read the content through the public repository or the published Pages site. The stable AI entry points are:

```text
docs/ai-index.json
docs/llms.txt
```

## Structure

```text
docs/
  index.html        Static reader UI
  app.js            Loads the index and Markdown entries
  styles.css        UI styling
  ai-index.json     Machine-readable content manifest
  entries/          Markdown entries
scripts/
  new_entry.py      Create a new entry and rebuild the manifest
```

## Add a new entry

```bash
python3 scripts/new_entry.py "Title of the thought" tag1 tag2
```

Then edit the created Markdown file under `docs/entries/`.

Rebuild the AI manifest after manual edits:

```bash
python3 scripts/new_entry.py --reindex
```

## GitHub Pages publishing

Publish from the `docs/` directory:

1. Open repository Settings.
2. Go to Pages.
3. Set Source to `Deploy from a branch`.
4. Select the default branch and `/docs`.
