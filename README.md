# Study Guide

A full-stack study tracker for university students: deadlines, subject progress, streaks, and a daily prayer tracker in one dashboard.

**Stack:** React 18 · Vite · Tailwind CSS 4 · TanStack Query · FastAPI · SQLAlchemy · PostgreSQL

<!-- Add a screenshot or GIF here once you have one:
![Dashboard](assets/dashboard.png)
-->

## Features

- **Task management:** create tasks with a subject and deadline, filter by status or subject, and see overdue and due-this-week work at a glance.
- **Progress tracking:** completion ring, 7-day activity chart, per-subject progress bars, and a daily completion streak.
- **Prayer tracker:** daily prayer times by city (via the [Aladhan API](https://aladhan.com/prayer-times-api)), configurable calculation method and school, five-prayer checklist, 60-day history, and a full-day streak. Toggles use optimistic updates.
- **Email verification:** signup sends a 6-digit OTP before the account can log in.
- **Light/dark theme** that follows the system preference and remembers your choice.
- **Responsive UI** for phones and laptops.

## Security

- Passwords hashed with **bcrypt**; JWT access tokens (`HS256`) with configurable expiry.
- Verification codes are stored only as **hashes**, expire after a set time, and lock out after 5 wrong attempts.
- Resend cooldown, and a uniform response on resend so the endpoint can't be used to discover which emails are registered.
- Every task and prayer query is scoped to the authenticated user.
- Secrets live in `.env` (gitignored); CORS origins are configurable.

## Project structure

```
.
├── backend/
│   ├── main.py            # FastAPI app, CORS, router registration
│   ├── models.py          # SQLAlchemy models: User, Task, PrayerLog
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── security.py        # Password hashing, JWT, OTP helpers
│   ├── dependencies.py    # get_current_user
│   ├── email_service.py   # SMTP sender (falls back to console in dev)
│   └── routers/           # auth, tasks, prayers
└── frontend/
    └── src/
        ├── pages/         # Home, AuthPage, VerifyEmail, Dashboard, Prayers
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

Interactive docs are available at `http://localhost:8000/docs` when the backend is running.

## Getting started

**Prerequisites:** Python 3.10+, Node.js 18+, PostgreSQL

### 1. Database

```sql
CREATE DATABASE study_guide;
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
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/study_guide
SECRET_KEY=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
OTP_EXPIRE_MINUTES=10

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

## Roadmap

- [ ] Focus timer (Pomodoro sessions counted toward streaks)
- [ ] Notes per subject
- [ ] Study planner built around exam dates and prayer times
- [ ] Alembic migrations (currently `create_all`)
- [ ] Installable PWA

