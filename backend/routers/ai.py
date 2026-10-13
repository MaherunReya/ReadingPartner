import io
import json
import os
import re
import time
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

import models
from dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

# Tried in order. Optionally add a second model name from AI Studio's model list as a fallback.
MODELS = ["gemini-3.8-flash"]
_client = None

CHAT_SYSTEM = (
    "You are a friendly study buddy inside a student's study app. The student is a university "
    "Computer Science and Engineering undergraduate. Explain clearly with small examples, keep "
    "answers short unless asked for more, and ask a quick question back when it helps them learn."
)

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


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


class CardsIn(BaseModel):
    text: str = Field(min_length=20, max_length=20000)
    count: int = Field(default=10, ge=3, le=30)


@router.post("/chat")
def chat(data: ChatIn, user: models.User = Depends(get_current_user)):
    if data.messages[-1].role != "user":
        raise HTTPException(422, "The last message must be yours")
    reply = _ask(CHAT_SYSTEM, [m.model_dump() for m in data.messages], 1000)
    return {"reply": reply}


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
def make_flashcards(data: CardsIn, user: models.User = Depends(get_current_user)):
    prompt = f"Make {data.count} flashcards from these lecture notes:\n\n{data.text}"
    raw = _ask(CARDS_SYSTEM, [{"role": "user", "content": prompt}], 8000)
    return {"cards": _parse_cards(raw, data.count)}


MAX_UPLOAD = 15 * 1024 * 1024  # 15 MB
MAX_CHARS = 20000  # matches the notes box on the flashcards page


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
    return {"text": text[:MAX_CHARS], "truncated": len(text) > MAX_CHARS}