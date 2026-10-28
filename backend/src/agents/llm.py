from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from dotenv import load_dotenv
import asyncio
import httpx
import json
import logging
import os
import re

load_dotenv()

logger = logging.getLogger("llm")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# "smart" does the heavy reasoning (page analysis, report writing);
# "fast" handles the fan-out work (one call per claim, follow-up chat)
SMART_MODEL = os.getenv("GEMINI_MODEL_SMART", "gemini-flash-latest")
FAST_MODEL = os.getenv("GEMINI_MODEL_FAST", "gemini-flash-lite-latest")
SMART_TIMEOUT = float(os.getenv("AI_TIMEOUT_SECONDS", "180"))
FAST_TIMEOUT = float(os.getenv("AI_FAST_TIMEOUT_SECONDS", "60"))
MAX_ATTEMPTS = 3

# Free-tier quotas are small; cap how many Gemini calls run at once
_semaphore = asyncio.Semaphore(int(os.getenv("AI_MAX_CONCURRENCY", "4")))

_SECRET_PATTERN = re.compile(r"(AIza[0-9A-Za-z_\-]{20,}|AQ\.[0-9A-Za-z_\-]{20,})")


class AIServiceError(Exception):
    """Raised with a message that is safe to show to end users."""


def redact(text: str) -> str:
    return _SECRET_PATTERN.sub("<redacted>", text)


def _parse_json(text: str):
    text = text.strip()
    # Tolerate ```json fences even though JSON mode is requested
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    return json.loads(text)


async def generate_json(system: str, prompt: str, smart: bool = True):
    """Run one Gemini call that must return a JSON object.

    Retries transient server errors (503 "high demand") with backoff. If the
    smart model keeps failing or times out, falls back to the fast model once.
    """
    models = [SMART_MODEL, FAST_MODEL] if smart else [FAST_MODEL]
    last_error = None

    for model in models:
        timeout = SMART_TIMEOUT if model == SMART_MODEL and smart else FAST_TIMEOUT
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                async with _semaphore:
                    response = await asyncio.wait_for(
                        client.aio.models.generate_content(
                            model=model,
                            contents=prompt,
                            config=types.GenerateContentConfig(
                                system_instruction=system,
                                response_mime_type="application/json",
                            ),
                        ),
                        timeout=timeout,
                    )
                return _parse_json(response.text or "")
            except asyncio.TimeoutError:
                last_error = AIServiceError(f"AI model {model} timed out after {timeout:.0f} seconds")
                logger.warning(str(last_error))
                break  # a slow model will stay slow; move to the fallback
            except json.JSONDecodeError as e:
                last_error = AIServiceError("AI returned malformed output")
                logger.warning(f"Malformed JSON from {model} (attempt {attempt}): {e}")
            except (genai_errors.ServerError, httpx.TransportError) as e:
                # 503 "high demand" and dropped connections on long requests are both transient
                last_error = AIServiceError("AI service is temporarily unavailable, please try again later")
                logger.warning(f"{model} {type(e).__name__} (attempt {attempt}/{MAX_ATTEMPTS}): {redact(str(e))}")
                await asyncio.sleep(2 ** attempt)
            except genai_errors.ClientError as e:
                code = getattr(e, "code", None)
                if code == 429:
                    last_error = AIServiceError("AI quota exceeded, please try again later")
                    logger.warning(f"{model} rate limited (attempt {attempt}): {redact(str(e))}")
                    await asyncio.sleep(5 * attempt)
                    continue
                if code in (401, 403):
                    raise AIServiceError("AI API key was rejected - check GEMINI_API_KEY") from None
                raise AIServiceError(f"AI request failed ({code})") from None

    raise last_error or AIServiceError("AI request failed")
