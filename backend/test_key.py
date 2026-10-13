import json, os, urllib.error, urllib.request
from dotenv import load_dotenv

load_dotenv()
key = (os.getenv("GEMINI_API_KEY") or "").strip()
print("key starts with:", key[:3], "| length:", len(key))
req = urllib.request.Request(
    "https://generativelanguage.googleapis.com/v1beta/models",
    headers={"x-goog-api-key": key},
)
try:
    data = json.load(urllib.request.urlopen(req))
    print("KEY WORKS. Models you can use:")
    for m in data["models"]:
        if "generateContent" in m.get("supportedGenerationMethods", []):
            print("  ", m["name"])
except urllib.error.HTTPError as e:
    print("FAILED:", e.code, e.read().decode()[:300])