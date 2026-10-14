import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  (registers tables on Base)
from database import Base, engine
from routers import ai, auth, flashcards, focus, mood, notes, prayers, tasks

load_dotenv()

app = FastAPI(title="AI Study OS API")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fine for now; switch to Alembic migrations before the schema changes again.
Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(prayers.router)
app.include_router(focus.router)
app.include_router(notes.router)
app.include_router(mood.router)
app.include_router(flashcards.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"message": "Reading Partner backend is running"}