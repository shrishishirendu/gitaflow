# GitaMoment Backend

FastAPI service that orchestrates the Karma Lens agent pipeline.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # then paste your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs (auto-generated): http://localhost:8000/docs

### Running for the mobile app

If you're testing the Expo mobile app on a real phone, the phone can't reach
`localhost`. Bind to all interfaces so the LAN can hit the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then put your **laptop's LAN IP** in `mobile/.env.local`. Details in
`mobile/README.md`.

## Endpoints

| Method | Path                          | Purpose                                  |
|--------|-------------------------------|------------------------------------------|
| POST   | `/api/karma-lens/analyse`     | Run the full agent pipeline on a situation |
| GET    | `/api/verses`                 | List all available Gita verses           |
| GET    | `/api/verses/daily`           | Today's verse (rotates by date)          |
| GET    | `/`                           | Health check                             |

## Architecture

The MVP runs all 6 agents in spec §7 inside a **single Claude call** with a
structured system prompt + JSON output. This is faster and cheaper than the
full chained pipeline. The prompt is in `app/prompts/karma_lens_system.md`.

When you're ready to scale (per spec week 2+), split the agents into
sequential calls in `app/agents/` and chain them via an orchestrator.

## Adding more verses

Edit `app/data/bhagavad_gita.json`. Each entry needs:

- `chapter`, `verse` (integers)
- `sanskrit`, `transliteration`, `translation`, `simple_meaning` (strings)
- `themes` (list of strings — see allowed values in the system prompt)
- `emotional_tags` (list of strings — see allowed values in the system prompt)

The verse `id` is the JSON key (e.g. `BG_2_47`). The model uses these IDs
to pick the best fit.
