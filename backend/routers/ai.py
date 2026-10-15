import io
import json
import os
import re
import time

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
import usage
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

# Tried in order. Optionally add a second model name from AI Studio's model list as a fallback.
MODELS = ["gemini-3.8-flash"]
_client = None

CARDS_SYSTEM = (
    "You turn lecture notes into flashcards. Reply with ONLY a JSON array, no other text. "
    'Each item is {"front": "...", "back": "..."}. Fronts are short questions or terms. '
    "Backs are clear answers of 1-3 sentences. Cover the most important ideas, one idea per card."
)


def _ask(system: str, messages: list[dict], max_tokens: int) -> str:
    global _client
    if _client is None:
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(503, "AI isn't set up yet. Add GEMINI_API_KEY to backend/.env")
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    contents = [
        types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part(text=m["content"])])
        for m in messages
    ]
    last = None
    for model in MODELS:
        for attempt in range(3):
            try:
                resp = _client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        max_output_tokens=max_tokens,
                        thinking_config=types.ThinkingConfig(thinking_budget=0),
                    ),
                )
                return (resp.text or "").strip()
            except errors.APIError as e:
                last = e
                print("GEMINI ERROR:", e)
                if e.code not in (429, 500, 503):
                    break  # not worth retrying, move on to the next model
                time.sleep(1.5 * (attempt + 1))
    raise HTTPException(502, "The AI is busy right now. Try again in a minute.") from last


MAX_WORDS = 8000  # one source (pasted or uploaded) can be at most this many words


def count_words(text: str) -> int:
    return len(text.split())


class CardsIn(BaseModel):
    # Character cap is only a safety net; the real limit is MAX_WORDS, checked below.
    text: str = Field(min_length=20, max_length=200000)
    count: int = Field(default=10, ge=3, le=30)


def _parse_cards(raw: str, limit: int) -> list[dict]:
    raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    try:
        items = json.loads(raw)
    except ValueError:
        match = re.search(r"\[.*\]", raw, re.S)
        try:
            items = json.loads(match.group(0)) if match else None
        except ValueError:
            items = None
    if not isinstance(items, list):
        raise HTTPException(502, "The AI's answer was garbled. Try again.")
    cards = []
    for it in items:
        if isinstance(it, dict) and isinstance(it.get("front"), str) and isinstance(it.get("back"), str):
            front, back = it["front"].strip()[:2000], it["back"].strip()[:2000]
            if front and back:
                cards.append({"front": front, "back": back})
    if not cards:
        raise HTTPException(502, "Couldn't find anything to make cards from. Try more detailed notes.")
    return cards[:limit]


@router.post("/flashcards")
def make_flashcards(data: CardsIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    plan = usage.plan_for(db, user)
    words = count_words(data.text)
    if words > plan["max_notes_words"]:
        raise HTTPException(
            422,
            f"Notes can be up to {plan['max_notes_words']:,} words and yours has {words:,}. Split the lecture into parts.",
        )
    usage.check(db, user, plan, "flashcards")

    count = min(data.count, plan["max_cards"])
    prompt = f"Make {count} flashcards from these lecture notes:\n\n{data.text}"
    row = usage.record(db, user, "flashcards")
    try:
        raw = _ask(CARDS_SYSTEM, [{"role": "user", "content": prompt}], 8000)
        cards = _parse_cards(raw, count)
    except Exception:
        usage.refund(db, row)
        raise
    return {"cards": cards}


MAX_UPLOAD = 15 * 1024 * 1024  # 15 MB


def _extract_text(name: str, data: bytes) -> str:
    ext = name.lower().rsplit(".", 1)[-1] if "." in name else ""
    if ext == "pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    if ext == "pptx":
        from pptx import Presentation

        lines = []
        for slide in Presentation(io.BytesIO(data)).slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    lines.append(shape.text_frame.text)
        return "\n".join(lines)
    if ext in ("txt", "md"):
        return data.decode("utf-8", errors="ignore")
    raise HTTPException(415, "Upload a PDF, a PowerPoint (.pptx) or a .txt file")


@router.post("/extract")
def extract_text(file: UploadFile = File(...), user: models.User = Depends(get_current_user)):
    """Pull the text out of an uploaded lecture so it can be turned into flashcards."""
    data = file.file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "That file is too big (15 MB max)")
    try:
        text = _extract_text(file.filename or "", data)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Couldn't read that file. Try another one.")
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) < 20:
        raise HTTPException(422, "No text found. Scanned or image-only slides can't be read, so paste the text instead.")
    # Keep the first MAX_WORDS words (whitespace preserved) so the notes box accepts it as-is.
    matches = list(re.finditer(r"\S+", text))
    truncated = len(matches) > MAX_WORDS
    if truncated:
        text = text[: matches[MAX_WORDS - 1].end()]
    return {"text": text, "truncated": truncated, "words": min(len(matches), MAX_WORDS), "max_words": MAX_WORDS}