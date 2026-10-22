# Reading Partner

A study platform for university students: turn lecture notes and slides into flashcards, review them with spaced repetition, and manage deadlines, focus sessions, mood, and daily prayers in one dashboard.

**Live demo:** https://YOUR-DEMO-URL | **Demo login:** `demo@example.com` / `demo1234`

**Stack:** React 18 · Vite · Tailwind CSS 4 · TanStack Query · FastAPI · SQLAlchemy · PostgreSQL · Gemini API · Stripe

![Dashboard](assets/dashboard.png)
![Flashcard generation](assets/flashcards.gif)

## Features

- **AI flashcards:** paste notes or upload a PDF/PowerPoint lecture, and the Gemini API generates flashcards from it.
- **Spaced repetition:** box-based (Leitner) scheduling; cards you know move to later boxes and come back less often, missed cards return sooner.
- **Task management:** create tasks with a subject and deadline, filter by status or subject, and see overdue and due-this-week work at a glance.
- **Progress tracking:** completion ring, 7-day activity chart, per-subject progress bars, and a daily completion streak.
- **Focus timer:** Pomodoro-style sessions for study blocks.
- **Mood tracking:** log how you feel each day.
- **Prayer tracker:** daily prayer times by city (via the [Aladhan API](https://aladhan.com/prayer-times-api)), configurable calculation method and school, five-prayer checklist, 60-day history, and a full-day streak. Toggles use optimistic updates.
- **Subscriptions:** Stripe plans with per-plan limits on AI usage.
- **Email verification:** signup sends a 6-digit OTP before the account can log in.
- **Light/dark theme** that follows the system preference and remembers your choice.
- **Responsive UI** for phones and laptops.

## Architecture

```
React (Vite, TanStack Query)
        |
        v
   FastAPI  ------>  PostgreSQL (SQLAlchemy)
     |   |
     |   +-------->  Gemini API   (flashcard generation)
     |   +-------->  Stripe       (subscriptions, webhooks)
     +------------>  SMTP         (verification emails)

Hosting: Vercel (frontend + API), managed PostgreSQL
```

**Key decisions**

- **AI usage limits are enforced on the server per plan**, so the frontend can't bypass them and Gemini costs stay predictable.
- **Lecture files are parsed on the server**, and the extracted text is what gets sent to Gemini.
- **Server state lives in TanStack Query** with optimistic updates for quick interactions like prayer toggles.
- **Every query is scoped to the authenticated user.**

## Security

- Passwords hashed with **bcrypt**; JWT access tokens (`HS256`) with configurable expiry.
- Verification codes are stored only as **hashes**, expire after a set time, and lock out after 5 wrong attempts.
- Resend cooldown, and a uniform response on resend so the endpoint can't be used to discover which emails are registered.
- Secrets live in `.env` (gitignored); CORS origins are configurable.

## Project structure

```
.
├── backend/
│   ├── main.py            # FastAPI app, CORS, router registration
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── security.py        # Password hashing, JWT, OTP helpers
│   ├── dependencies.py    # get_current_user
│   ├── email_service.py   # SMTP sender (falls back to console in dev)
│   └── routers/           # auth, tasks, prayers, flashcards, billing, ...
└── frontend/
    └── src/
        ├── pages/         # Home, AuthPage, VerifyEmail, Dashboard, Flashcards, Prayers
        ├── components/    # TaskForm, TaskItem, ProgressRing, WeekChart, ...
        ├── api.js         # Axios client with auth + 401 handling
        └── prayers.js     # Prayer-time fetching, logging hooks, streak logic
```

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/signup` | Create an account and email a verification code |
| POST | `/auth/verify-email` | Verify the account with the OTP |
| POST | `/auth/resend-verification` | Request a new code (rate-limited) |
| POST | `/auth/login` | Get an access token (verified accounts only) |
| GET | `/auth/me` | Current user |
| GET / POST | `/tasks` | List (filter by `subject`, `completed`) / create |
| GET / PATCH / DELETE | `/tasks/{id}` | Read / update / delete a task |
| GET | `/prayers?start=&end=` | Prayer logs in a date range |
| PUT | `/prayers/{date}/{prayer}` | Mark a prayer done or not (idempotent) |
| POST | `/flashcards/generate` | Generate flashcards from notes or an uploaded file |
| GET | `/flashcards/review` | Cards due for review today |
| POST | `/flashcards/{id}/review` | Record a review result and move the card between boxes |
| POST | `/billing/checkout` | Start a Stripe checkout session |
| POST | `/billing/webhook` | Stripe webhook (subscription status) |

Interactive docs are available at `http://localhost:8000/docs` when the backend is running.

## Getting started

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL, a Gemini API key, and (optional) a Stripe test account

### 1. Database

```sql
CREATE DATABASE reading_partner;
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/reading_partner
SECRET_KEY=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
OTP_EXPIRE_MINUTES=10

GEMINI_API_KEY=your-gemini-key

# Stripe (use test keys locally)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional. If SMTP_HOST is unset, verification emails are printed to the console.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Run it (tables are created on startup):

```bash
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. To point at a different backend, set `VITE_API_URL` (defaults to `http://localhost:8000`).

## Tests and performance

<!-- Fill in once measured, then delete this comment:
- `pytest` : [X] tests, [X]% coverage
- Load test (k6): [X] concurrent users, p95 latency under [X] ms
-->

## Roadmap

- [ ] Alembic migrations (currently `create_all`)
- [ ] Automated tests and CI (GitHub Actions)
- [ ] Notes per subject
- [ ] Study planner built around exam dates and prayer times
- [ ] Installable PWA
