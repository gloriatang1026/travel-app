"""Host the trip planner the way the Gym Tracker web build is hosted.

Gym Tracker is a standalone page (Add to Home Screen on iPhone). This serves
that same kind of page, and adds one route Safari cannot do itself: reading a
public Google Maps list. Google blocks that call from a phone browser.

    python serve.py

Then open the printed address in Safari and use Share, Add to Home Screen.
"""

from __future__ import annotations

import html
import json
import os
import re
import socket
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

ROOT = Path(__file__).resolve().parent
HOST = "0.0.0.0"
PORT = 8787
MAX_BODY = 16_000
MAX_PLAN_BODY = 400_000
MAX_DOWNLOAD = 8_000_000
ENV_PATH = ROOT / ".env"

ALLOWED_PAGE_HOSTS = {
    "maps.app.goo.gl",
    "goo.gl",
    "maps.google.com",
    "www.google.com",
    "google.com",
}

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
}


class GuardedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _check_page_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _check_page_url(url: str) -> None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or host not in ALLOWED_PAGE_HOSTS:
        raise ValueError("Use a public Google Maps list link (maps.app.goo.gl or google.com/maps).")


def _fetch(url: str, headers: dict[str, str] | None = None, opener=None) -> str:
    request = urllib.request.Request(url, headers=headers or {})
    open_fn = opener.open if opener else urllib.request.urlopen
    with open_fn(request, timeout=25) as response:
        data = response.read(MAX_DOWNLOAD + 1)
    if len(data) > MAX_DOWNLOAD:
        raise ValueError("Google sent a response that was too large.")
    return data.decode("utf-8", "replace")


def fetch_list(url: str) -> dict:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    _check_page_url(url)

    opener = urllib.request.build_opener(GuardedRedirect)
    page = _fetch(url, opener=opener)
    match = re.search(r'href="([^"]*entitylist/getlist[^"]*)"', page)
    if not match:
        raise ValueError(
            "That link did not open a public list. Private lists stay in Google, "
            "and ordinary place links are not lists."
        )
    api = html.unescape(match.group(1))
    if api.startswith("/"):
        api = "https://www.google.com" + api
    parsed = urlparse(api)
    if parsed.hostname != "www.google.com" or not parsed.path.startswith("/maps/preview/entitylist/getlist"):
        raise ValueError("The list page did not point at a Google list.")

    raw = _fetch(api, headers={"User-Agent": "Mozilla/5.0"})
    index = 0
    while index < len(raw) and raw[index] in ")]}'\n\\":
        index += 1
    data = json.loads(raw[index:])
    if not isinstance(data, list) or not data or not isinstance(data[0], list):
        raise ValueError("Google returned a list page this app could not read.")
    root = data[0]
    list_name = root[4] if len(root) > 4 and isinstance(root[4], str) and root[4] else "Imported list"
    owner = None
    if len(root) > 3 and isinstance(root[3], list) and root[3] and isinstance(root[3][0], str):
        owner = root[3][0]
    items = root[8] if len(root) > 8 and isinstance(root[8], list) else None
    if items is None:
        raise ValueError("That list did not include any places.")

    places = []
    for item in items:
        if not isinstance(item, list) or len(item) < 3 or not isinstance(item[2], str) or not item[2].strip():
            continue
        info = item[1] if len(item) > 1 and isinstance(item[1], list) else []
        address = ""
        for slot in (2, 4):
            if len(info) > slot and isinstance(info[slot], str) and info[slot].strip():
                address = info[slot].strip()
                break
        lat = lng = None
        if len(info) > 5 and isinstance(info[5], list) and len(info[5]) > 3:
            if isinstance(info[5][2], (int, float)) and isinstance(info[5][3], (int, float)):
                lat = float(info[5][2])
                lng = float(info[5][3])
        note = item[3].strip() if len(item) > 3 and isinstance(item[3], str) else ""
        maps_url = None
        if lat is not None and lng is not None:
            maps_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
        places.append(
            {
                "name": item[2].strip(),
                "address": address,
                "lat": lat,
                "lng": lng,
                "note": note,
                "mapsUrl": maps_url,
            }
        )
    if not places:
        raise ValueError("That list did not include any places.")
    return {"name": list_name, "owner": owner, "places": places}


def _lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def load_env() -> None:
    if not ENV_PATH.is_file():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def save_gemini_key(key: str) -> None:
    key = key.strip()
    if len(key) < 20 or any(char in key for char in "\r\n\t "):
        raise ValueError("Paste the key from Google AI Studio, with no spaces.")
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.is_file() else []
    written = False
    output = []
    for line in lines:
        if line.startswith("GEMINI_API_KEY="):
            output.append(f"GEMINI_API_KEY={key}")
            written = True
        else:
            output.append(line)
    if not written:
        output.append(f"GEMINI_API_KEY={key}")
    ENV_PATH.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")
    os.environ["GEMINI_API_KEY"] = key


def ai_provider() -> dict | None:
    if os.environ.get("DAYTRIP_AI", "").lower() == "xai" and os.environ.get("XAI_API_KEY"):
        return {
            "name": "SpaceXAI",
            "free": False,
            "model": os.environ.get("XAI_MODEL", "grok-4.5"),
            "fallbacks": [],
            "url": "https://api.x.ai/v1/chat/completions",
            "key": os.environ["XAI_API_KEY"],
        }
    if os.environ.get("GEMINI_API_KEY"):
        return {
            "name": "Gemini",
            "free": True,
            "model": os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
            "fallbacks": ["gemini-2.0-flash"],
            "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            "key": os.environ["GEMINI_API_KEY"],
        }
    if os.environ.get("GROQ_API_KEY"):
        return {
            "name": "Groq",
            "free": True,
            "model": os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b"),
            "fallbacks": [],
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "key": os.environ["GROQ_API_KEY"],
        }
    if os.environ.get("XAI_API_KEY"):
        return {
            "name": "SpaceXAI",
            "free": False,
            "model": os.environ.get("XAI_MODEL", "grok-4.5"),
            "fallbacks": [],
            "url": "https://api.x.ai/v1/chat/completions",
            "key": os.environ["XAI_API_KEY"],
        }
    return None


WIKI_CACHE: dict[str, dict] = {}


def wiki_summary(title: str) -> dict:
    title = title.strip().replace(" ", "_")
    if not title or len(title) > 180:
        raise ValueError("Missing article title.")
    if title in WIKI_CACHE:
        return WIKI_CACHE[title]
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + quote(title)
    request = urllib.request.Request(url, headers={"User-Agent": "Daytrip/1.0 (personal trip planner)"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            result = {"title": title, "extract": "", "photo": ""}
            WIKI_CACHE[title] = result
            return result
        raise ValueError("Could not load a photo for that place.") from error
    thumb = data.get("thumbnail") or {}
    result = {
        "title": data.get("title") or title,
        "extract": str(data.get("extract") or "")[:500],
        "photo": str(thumb.get("source") or ""),
    }
    WIKI_CACHE[title] = result
    return result


def ai_status() -> dict:
    chosen = ai_provider()
    if not chosen:
        return {"ok": True, "ai": False}
    return {"ok": True, "ai": True, "provider": chosen["name"], "free": chosen["free"]}


def _message_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                parts.append(str(part.get("text") or part.get("content") or ""))
            else:
                parts.append(str(part))
        return "".join(parts)
    return str(content or "")


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("The planner answered, but not as a plan. Try again.")
    try:
        parsed = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as error:
        raise ValueError("The planner answered, but not as a plan. Try again.") from error
    if not isinstance(parsed, dict):
        raise ValueError("The planner answered, but not as a plan. Try again.")
    return parsed


def _clean_time(value) -> str:
    match = re.search(r"(\d{1,2}):(\d{2})", str(value or ""))
    if not match:
        return ""
    hour = max(0, min(23, int(match.group(1))))
    minute = max(0, min(59, int(match.group(2))))
    return f"{hour:02d}:{minute:02d}"


def _ask_model(chosen: dict, messages: list) -> str:
    models = [chosen["model"], *chosen["fallbacks"]]
    last_error = "The planner did not answer."
    for index, model in enumerate(models):
        body = json.dumps({"model": model, "temperature": 0.3, "messages": messages}).encode("utf-8")
        request = urllib.request.Request(
            chosen["url"],
            data=body,
            headers={
                "Authorization": f"Bearer {chosen['key']}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=70) as response:
                data = json.loads(response.read().decode("utf-8", "replace"))
            content = data["choices"][0]["message"]["content"]
            return _message_text(content)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:240]
            if error.code in {401, 403}:
                raise ValueError("That AI key was rejected. In Google AI Studio, create a new key and paste it again.") from error
            if error.code == 429:
                raise ValueError("The free planner is at its limit for the moment. Wait a minute and try again.") from error
            if error.code == 404 and index < len(models) - 1:
                continue
            last_error = f"The planner could not run ({error.code}). {detail}"
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError, OSError) as error:
            last_error = "Could not reach the planner. Check the internet connection and try again."
            if index < len(models) - 1:
                continue
            raise ValueError(last_error) from error
    raise ValueError(last_error)


def plan_with_ai(payload: dict) -> dict:
    chosen = ai_provider()
    if not chosen:
        raise ValueError("Add a free Gemini key first. Google AI Studio gives one with no card.")
    places = payload.get("places") if isinstance(payload.get("places"), list) else []
    if not places:
        raise ValueError("Import a list before asking for a plan.")
    day_count = int(payload.get("days") or 1)
    day_count = max(1, min(14, day_count))
    compact_places = []
    for place in places[:80]:
        if not isinstance(place, dict) or not place.get("id") or not place.get("name"):
            continue
        compact_places.append({
            "id": str(place["id"])[:40],
            "name": str(place["name"])[:80],
            "kind": str(place.get("kind") or "")[:20],
            "lat": place.get("lat"),
            "lng": place.get("lng"),
            "note": str(place.get("note") or "")[:120],
        })
    flights = payload.get("flights") if isinstance(payload.get("flights"), list) else []
    brief = {
        "trip": str(payload.get("name") or "Trip")[:80],
        "startDate": str(payload.get("startDate") or "")[:10],
        "days": day_count,
        "wish": str(payload.get("wish") or "")[:500],
        "flights": flights[:8],
        "places": compact_places,
    }
    messages = [
        {
            "role": "system",
            "content": (
                "You plan a trip. Reply with JSON only, no markdown. "
                'Schema: {"summary": string, "days": [{"day": number, "title": string, '
                '"places": [{"id": string, "time": "HH:MM", "why": string}]}]}. '
                "Use only the given place ids, each id once. day is 0-based and must be inside the trip. "
                "Keep nearby coordinates on the same day. Times are local, 08:00 to 20:00, in order. "
                "If a flight lands that day, start after arrival plus 90 minutes. "
                "If a flight leaves that day, finish at least 3 hours before departure. "
                "Food places go near lunch or dinner. Lookouts and hikes go earlier. why is one short sentence."
            ),
        },
        {"role": "user", "content": json.dumps(brief, ensure_ascii=False)},
    ]
    plan = _extract_json(_ask_model(chosen, messages))
    known = {place["id"] for place in compact_places}
    used = set()
    days = []
    for day in plan.get("days") or []:
        if not isinstance(day, dict):
            continue
        try:
            index = int(day.get("day"))
        except (TypeError, ValueError):
            continue
        if index < 0 or index >= day_count:
            continue
        items = []
        for item in day.get("places") or []:
            if not isinstance(item, dict):
                continue
            place_id = str(item.get("id") or "")
            if place_id not in known or place_id in used:
                continue
            used.add(place_id)
            items.append({
                "id": place_id,
                "time": _clean_time(item.get("time")),
                "why": str(item.get("why") or "")[:180],
            })
        days.append({"day": index, "title": str(day.get("title") or "")[:40], "places": items})
    if not used:
        raise ValueError("The planner did not place any of your stops. Try again.")
    return {
        "summary": str(plan.get("summary") or "")[:400],
        "days": days,
        "provider": chosen["name"],
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        if str(args[1:2]) not in {"('200',)", "('304',)"}:
            super().log_message(fmt, *args)

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, payload: dict) -> None:
        self._send(code, json.dumps(payload).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self._json(200, ai_status())
            return
        if path == "/api/wiki":
            title = (parse_qs(urlparse(self.path).query).get("title") or [""])[0]
            try:
                self._json(200, wiki_summary(title))
            except ValueError as error:
                self._json(400, {"error": str(error)})
            return
        if path == "/":
            path = "/index.html"
        if path.startswith("/.") or ".." in path:
            self._send(404, b"Not found", "text/plain; charset=utf-8")
            return
        file_path = (ROOT / path.lstrip("/")).resolve()
        if file_path.name.startswith(".") or not str(file_path).startswith(str(ROOT)) or not file_path.is_file():
            self._send(404, b"Not found", "text/plain; charset=utf-8")
            return
        self._send(200, file_path.read_bytes(), MIME.get(file_path.suffix.lower(), "application/octet-stream"))

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path not in {"/api/import", "/api/plan", "/api/ai-key"}:
            self._json(404, {"error": "Not found"})
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        limit = MAX_PLAN_BODY if path == "/api/plan" else MAX_BODY
        if length <= 0 or length > limit:
            self._json(400, {"error": "That request was empty or too large."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self._json(400, {"error": "Could not read that request."})
            return
        try:
            if path == "/api/import":
                result = fetch_list(str(payload.get("url", "")))
            elif path == "/api/ai-key":
                save_gemini_key(str(payload.get("key", "")))
                result = ai_status()
            else:
                result = plan_with_ai(payload)
        except ValueError as error:
            self._json(400, {"error": str(error)})
            return
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            self._json(502, {"error": "Could not reach the service. Try again."})
            return
        self._json(200, result)


def main() -> None:
    load_env()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    lan = _lan_ip()
    print("Trip planner")
    print(f"  On this computer:  http://127.0.0.1:{PORT}")
    print(f"  On your iPhone:    http://{lan}:{PORT}")
    print("Same Wi-Fi as this computer, then Safari, Share, Add to Home Screen.")
    print("Ctrl+C stops it. Plans stay on the phone after that.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
