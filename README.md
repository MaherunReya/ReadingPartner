
# Reading Partner

A study and revision management platform for university students. Organize coursework, manage deadlines, track study progress, and turn lecture materials into revision resources.

Reading Partner brings everyday study activities into one place. Students can manage academic tasks, create flashcards from their notes, review them using a Leitner-based spaced repetition system, and keep track of their study routines.

**Live demo:** https://readingpartner.vercel.app  
**Demo login:** `demo@example.com` / `demo1234`

**Tech stack:** React 18 · Vite · Tailwind CSS 4 · TanStack Query · FastAPI · SQLAlchemy · PostgreSQL · Gemini API · Stripe

![Reading Partner Dashboard](frontend/assets/dashboard.png)

![Flashcards](frontend/assets/flashcards.png)

## Features

### Study and revision

- **Flashcard generation:** Generate flashcards from pasted lecture notes or uploaded PDF and PowerPoint files using the Gemini API.
- **Quiz generation:** Generate quizzes from study materials to support self-assessment.
- **Spaced repetition:** Uses the Leitner box-based scheduling method. Correctly answered cards move to later boxes and appear less frequently, while missed cards return sooner.
- **Review tracking:** Access flashcards due for review and record review results to update their scheduling.

### Study organization

- **Task management:** Create tasks with subjects and deadlines, filter by completion status or subject, and identify overdue and upcoming work.
- **Progress tracking:** View a completion ring, 7-day activity chart, per-subject progress bars, and daily completion streak.
- **Focus timer:** Use Pomodoro-style sessions to structure study periods.
- **Mood tracking:** Record daily mood.

### Daily routine

- **Prayer tracker:** View prayer times based on city using the [Aladhan Prayer Times API](https://aladhan.com/prayer-times-api).
  - Configurable calculation method and school.
  - Five-prayer daily checklist.
  - 60-day prayer history.
  - Daily completion streak.
  - Optimistic updates for prayer toggles.

### Account and application

- **Email verification:** New accounts require a 6-digit OTP before login.
- **Authentication:** JWT-based authentication and password hashing with bcrypt.
- **Subscriptions:** Stripe checkout and subscription management with server-enforced AI usage limits per plan.
- **Themes:** Light and dark themes, following system preferences by default and remembering the user's choice.
- **Responsive interface:** Designed for both mobile and desktop screens.

## Architecture

```text
                 React (Vite, TanStack Query)
                            |
                            v
                         FastAPI
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
        PostgreSQL       Gemini API      Stripe
        (SQLAlchemy)   (AI generation)  (Billing)
                            |
                            |
                           SMTP
                    (Verification emails)

Hosting: Vercel (frontend + API), managed PostgreSQL
```

### Key engineering decisions

- **Server-side AI usage enforcement:** AI usage limits are checked on the backend according to each user's subscription plan, preventing frontend-only restrictions from being bypassed.
- **Server-side file processing:** Uploaded lecture files are parsed on the backend, and extracted text is passed to the Gemini API for content generation.
- **Server state management:** TanStack Query manages server state, with optimistic updates for interactions such as prayer tracking.
- **User-scoped data access:** Authenticated user context is used to scope application queries and operations.
- **Idempotent prayer updates:** Prayer completion endpoints support repeated requests without creating duplicate state changes.

## Security

- Passwords are hashed using **bcrypt**.
- JWT access tokens use **HS256** with configurable expiration.
- Email verification codes are stored as hashes and expire after a configurable period.
- Verification attempts are limited, with account verification locked after five incorrect attempts.
- Resend verification requests have a cooldown.
- The resend endpoint uses a uniform response to reduce email-account enumeration.
- Application secrets are stored in environment variables, with `.env` excluded from version control.
- CORS origins are configurable.

## Project structure

```text
.
├── backend/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── security.py          # Password hashing, JWT, OTP helpers
│   ├── dependencies.py      # Authentication dependencies
│   ├── email_service.py     # SMTP sender
│   └── routers/             # Auth, tasks, prayers, flashcards, billing, etc.
│
└── frontend/
    └── src/
        ├── pages/           # Home, AuthPage, VerifyEmail, Dashboard,
        │                    # Flashcards, Prayers
        ├── components/      # TaskForm, TaskItem, ProgressRing,
        │                    # WeekChart, etc.
        ├── api.js           # Axios client with authentication and 401 handling
        └── prayers.js       # Prayer-time fetching, logging hooks, streak logic
```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Create an account and send a verification code |
| POST | `/auth/verify-email` | Verify an account using an OTP |
| POST | `/auth/resend-verification` | Request a new verification code |
| POST | `/auth/login` | Authenticate a verified account |
| GET | `/auth/me` | Retrieve the current user |
| GET / POST | `/tasks` | List or create tasks |
| GET / PATCH / DELETE | `/tasks/{id}` | Retrieve, update, or delete a task |
| GET | `/prayers?start=&end=` | Retrieve prayer logs within a date range |
| PUT | `/prayers/{date}/{prayer}` | Mark a prayer as completed or not completed |
| POST | `/flashcards/generate` | Generate flashcards from notes or an uploaded file |
| GET | `/flashcards/review` | Retrieve flashcards due for review |
| POST | `/flashcards/{id}/review` | Record a review result and update its Leitner box |
| POST | `/billing/checkout` | Start a Stripe checkout session |
| POST | `/billing/webhook` | Handle Stripe subscription updates |

Interactive API documentation is available at `http://localhost:8000/docs` when the backend is running.

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL
- Gemini API key (for flashcard and quiz generation)
- Stripe test account (optional, for local billing integration)

### 1. Clone the repository

```bash
git clone https://github.com/MaherunReya/ReadingPartner.git
cd ReadingPartner
```

### 2. Create the database

In PostgreSQL, create a database:

```sql
CREATE DATABASE reading_partner;
```

### 3. Set up the backend

Create and activate a virtual environment:

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/reading_partner

SECRET_KEY=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=1440

CORS_ORIGINS=http://localhost:5173

OTP_EXPIRE_MINUTES=10

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Stripe (use test keys locally)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional SMTP configuration.
# If SMTP_HOST is unset, verification emails are printed to the console.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Start the backend:

```bash
uvicorn main:app --reload
```

The application creates database tables on startup.

The API will be available at:

```text
http://localhost:8000
```

### 4. Set up the frontend

Open another terminal:

```bash
cd frontend

npm install
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

To connect to a different backend, configure `VITE_API_URL`. It defaults to `http://localhost:8000`.

## Tests and performance

The project includes a local load test using k6 against authenticated REST endpoints.

| Metric | Result |
|---|---:|
| Total requests | 9,000+ |
| Concurrent virtual users | 10 |
| HTTP error rate | 0% |
| 95th percentile latency | 91 ms |

These results represent a local test configuration and should not be interpreted as production-scale performance benchmarks.

## Known limitations

- **Gemini API quota:** Flashcard and quiz generation depend on the Gemini API. The free-tier quota is limited, so generation may become temporarily unavailable when the quota is exhausted.
- **External services:** Email verification, payment processing, prayer-time retrieval, and AI generation depend on their respective external services and configurations.
- **Stripe integration:** A Stripe test account and webhook configuration are required to test the billing workflow locally.

## Future improvements

- Improve AI generation reliability and provide clearer feedback when API limits are reached.
- Explore alternative or local approaches to flashcard and quiz generation.
- Expand revision analytics and study progress insights.
- Improve the overall revision workflow and user experience.

---

**Built as a full-stack project using React, FastAPI, and PostgreSQL.**
