import os
import json
import urllib.request
import urllib.error
import logging

logger = logging.getLogger(__name__)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2"  # Alice
MODEL_ID = "eleven_multilingual_v2"

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "audio_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def get_audio_for_report(report_id: int, text: str) -> str:
    file_path = os.path.join(CACHE_DIR, f"report_{report_id}.mp3")
    if os.path.exists(file_path):
        return file_path
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY is not set.")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    data = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5}
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            with open(file_path, "wb") as f:
                f.write(response.read())
        return file_path
    except urllib.error.HTTPError as e:
        logger.error(f"ElevenLabs API error: {e.read().decode('utf-8')}")
        raise
    except Exception as e:
        logger.error(f"Failed to generate TTS: {e}")
        raise
