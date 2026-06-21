# GitaMoment

> Live the Bhagavad Gita, one decision at a time.

A mobile-first Bhagavad Gita guidance app. The core feature is **Karma Lens** — describe a real-life situation and receive structured guidance through an AI agent pipeline (emotion analysis → dharma classification → Gita verse retrieval → wisdom synthesis → three action paths → micro-practice).

This repo holds three pieces, all aligned to the product spec:

```
gitaflow/
├── backend/         FastAPI + Anthropic SDK   ← shared brain
├── frontend/        Vite + React + Tailwind   ← web client
└── mobile/          Expo + React Native       ← phone client
```

The backend is the only place that holds the Anthropic API key. Both clients hit `/api/karma-lens/analyse` over HTTP.

---

## Quick start

You'll need:
- **Node 18+** (for frontend and mobile)
- **Python 3.10+** (for backend)
- An **Anthropic API key** — https://console.anthropic.com/

### 1. Backend (always start this first)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                       # paste your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` lets phones on your Wi-Fi reach the backend. Without it, only your laptop can. Keep it — Vite proxies the web frontend regardless.

### 2. Web frontend (optional)

```bash
cd frontend
npm install
npm run dev                                # opens http://localhost:5173
```

### 3. Mobile app (Expo Go)

```bash
cd mobile
npm install
cp .env.example .env.local
# Open .env.local — set EXPO_PUBLIC_API_BASE to your laptop's LAN IP.
# (macOS: `ipconfig getifaddr en0`. Windows: `ipconfig`. Linux: `hostname -I`.)
npm run start
```

A QR code appears.
- **iOS:** open Camera, scan, tap the Expo notification.
- **Android:** open Expo Go, tap "Scan QR code".

Phone and laptop must be on the **same Wi-Fi**. See `mobile/README.md` for troubleshooting.

---

## How it works

When the user submits a situation, `POST /api/karma-lens/analyse` runs a single structured Claude call (system prompt in `backend/app/prompts/karma_lens_system.md`) that performs all six agent roles at once and returns one validated JSON response.

The response is hydrated with the full verse object from `backend/app/data/bhagavad_gita.json` before being sent to the client.

This monolithic-prompt approach is intentional for the MVP — it's faster and cheaper. As you grow, split it into the chained 6-agent pipeline described in spec §7.

---

## Where the spec lives

| Spec section                | Code location                                          |
|-----------------------------|--------------------------------------------------------|
| §3 Karma Lens               | `mobile/src/screens/LensScreen.jsx` + web equivalent   |
| §7 Agent orchestration      | `backend/app/api/routes_karma_lens.py`                 |
| §7.3 / §13 Gita verses      | `backend/app/data/bhagavad_gita.json`                  |
| §7.6 Safety agent           | System prompt + crisis branch in both clients          |
| §8 Mobile UX flow           | `mobile/src/screens/`                                  |
| §9 API spec                 | `backend/app/api/routes_karma_lens.py`                 |
| §10 DB schema               | _Not yet — Week 1 task_                                |
| §11 Folder structure        | This repo (web frontend added alongside)               |
| §12 Prompts                 | `backend/app/prompts/`                                 |
| §15 Safety boundaries       | System prompt + crisis branch                          |

---

## Roadmap (from spec §16)

- ✅ **Week 1 partial** — backend skeleton + verse retrieval + first endpoint
- ✅ **Week 2 partial** — agent orchestration (single-prompt pipeline)
- ✅ **Week 3 partial** — web frontend + Expo mobile app with all main views
- ⬜ **Week 4** — onboarding flow, dashboard, polish, deploy
- ⬜ **Beyond MVP** — split agents into separate calls, SQLite + reflections endpoint, FAISS embeddings, multi-language

---

## Common gotchas

**Mobile app shows "Could not reach backend"**
1. Did you put the LAN IP (not `localhost`) in `mobile/.env.local`?
2. Is the backend running with `--host 0.0.0.0`?
3. Are phone and laptop on the same Wi-Fi?

**Backend returns 500 about ANTHROPIC_API_KEY** — `cp backend/.env.example backend/.env` and paste your key.

**Fonts look wrong on first launch** — the Expo app downloads Fraunces and DM Sans on first run. Make sure your phone has internet.

---

## Disclaimers

GitaMoment offers reflection — not professional therapy, medical, legal, or financial advice. The safety guardrails in the system prompt are non-negotiable. See spec §15.
