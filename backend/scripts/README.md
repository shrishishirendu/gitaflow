# GitaMoment Ingestion Scripts

Tools for building the verse library that powers Karma Lens. Run these
from the `backend/` directory.

## What's here

```
scripts/
├── fetch_gita_source.py    # Step 1: download all 700 verses from public domain source
├── ingest_gita.py          # Step 2: tag every verse with simple_meaning + themes + emotional_tags via Claude
├── validate_gita.py        # Step 3: lint the final JSON for issues
└── README.md               # This file
```

## Workflow

```bash
# Activate your venv first
cd backend
.\.venv\Scripts\Activate.ps1     # Windows
source .venv/bin/activate         # Mac/Linux

# Step 1 — download raw verses (free, ~30 seconds)
python scripts/fetch_gita_source.py

# Step 2 — tag them with Claude (~$2-5, ~20-30 minutes)
python scripts/ingest_gita.py

# Step 3 — sanity-check the output
python scripts/validate_gita.py

# Step 4 — restart the backend so it picks up the new verses
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

That's it. Your app now serves all 700 verses.

## What ingest_gita.py does

For each verse, it sends Sanskrit + transliteration + translation to Claude
and asks for three pieces of metadata:

- **`simple_meaning`** — a one-sentence modern paraphrase (the most important field
  — this is what users see on the verse card)
- **`themes`** — 1–3 tags from a fixed allowed list (`karma_yoga`, `equanimity`, etc.)
- **`emotional_tags`** — 2–5 tags from a fixed allowed list (`anxiety`, `pride`, etc.)

These three fields are what the agent uses at runtime to pick the right verse for
a user's situation. Better tags → better verse matches.

## Cost & timing

Estimated per run on `claude-sonnet-4-5`:

| Verses | Cost      | Time   |
|--------|-----------|--------|
| 100    | ~$0.50    | ~5 min |
| 700    | ~$3.50    | ~25 min |

`ingest_gita.py` will print a real estimate before starting and ask for confirmation.

For testing the pipeline cheaply, use Haiku:
```bash
ANTHROPIC_MODEL=claude-haiku-4-5 python scripts/ingest_gita.py --limit 20
```

## Re-running and refinement

The script is **resumable**. By default it skips verses that are already tagged in
`app/data/bhagavad_gita.json`. So:

- **First run** taggs everything (~700 verses)
- **If it crashes at verse 423**, just re-run — it picks up at #424
- **Failed verses** (logged to `failures.log`) get re-attempted on next run
- **Manual edits** in `bhagavad_gita.json` are preserved

If you want to re-tag everything (e.g., after editing the prompt):
```bash
python scripts/ingest_gita.py --force
```

If you want to re-tag just one chapter:
```bash
python scripts/ingest_gita.py --chapter 2 --force
```

## Tweaking the tagging prompt

The system prompt for tagging lives at the top of `ingest_gita.py` in the
`TAGGING_SYSTEM_PROMPT` constant. Edit it, then re-run with `--force` on a few
verses to see how the output changes:

```bash
python scripts/ingest_gita.py --chapter 2 --force --limit 5
```

The allowed `themes` and `emotional_tags` are also defined at the top of the
script. **Important:** these must stay in sync with the runtime system prompt
at `app/prompts/karma_lens_system.md`. If you add a new emotional tag here, add
it there too.

## Validation

`validate_gita.py` checks every entry for:

- Missing fields
- Tags outside the allowed set
- `simple_meaning` that's suspiciously short or long
- ID/chapter/verse mismatches

Run it after every ingestion. Failures need to be fixed (either by hand-editing
the JSON or re-running with `--force` on the affected verse/chapter).

## Troubleshooting

**"ANTHROPIC_API_KEY not set"** — your `.env` file is missing or doesn't have a key.
Same setup as the main backend.

**"could not fetch from any source"** — internet issue, or the source repos moved.
Check the URLs in `fetch_gita_source.py` are still alive.

**Most verses tagged successfully but a few in `failures.log`** — open the log,
look at the raw model output. Usually the model returned slightly malformed JSON
for those edge cases. Just re-run `ingest_gita.py` (failures auto-retry by being
in the "not yet tagged" set on next run).

**Tags feel generic across many verses** — your prompt may be steering Claude
toward safe defaults. Tighten the `GUIDELINES` section in `TAGGING_SYSTEM_PROMPT`.
The Chapter 2.47 verse should never get the same tags as Chapter 12.13 — if they
do, something's off.

**Want to use the gita source verses as fallback even if the tags fail** —
already handled. Untagged source verses are kept in `data/gita_source.json`;
your runtime API only reads `app/data/bhagavad_gita.json`. So failed verses
simply don't get served until you fix them.
