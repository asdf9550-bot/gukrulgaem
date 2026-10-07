"""공통 도우미: 설정 읽기, 환경 변수(.env), HTTP 호출(간격·재시도), 게임 이름 정리."""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = "steam-buy-guide/0.1 (personal site)"


def load_rules() -> dict:
    return json.loads((ROOT / "config" / "rules.json").read_text(encoding="utf-8"))


def load_env() -> None:
    """`.env` 파일의 KEY=VALUE 줄을 환경 변수로 올린다(이미 있는 값은 그대로)."""
    path = ROOT / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env(name: str) -> str | None:
    load_env()
    value = os.environ.get(name)
    return value.strip() if value else None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


_last_call: dict[str, float] = {}


def get_json(url: str, params: dict | None = None, *, host_interval: float = 0.0, retry: int = 3,
             timeout: int = 20, method: str = "GET", body=None, headers: dict | None = None):
    """JSON을 가져온다. 같은 호스트 호출 사이에 간격을 두고, 실패하면 점점 길게 기다렸다 다시 시도한다."""
    if params:
        url = f"{url}?{urlencode(params)}"
    host = url.split("/")[2]
    wait = host_interval - (time.monotonic() - _last_call.get(host, 0.0))
    if wait > 0:
        time.sleep(wait)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    head = {"User-Agent": USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9"}
    if data is not None:
        head["Content-Type"] = "application/json"
    head.update(headers or {})
    last_error: Exception | None = None
    for attempt in range(retry):
        try:
            _last_call[host] = time.monotonic()
            with urlopen(Request(url, data=data, headers=head, method=method), timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8", errors="replace"))
        except HTTPError as error:
            if error.code in (401, 403, 404):
                raise
            last_error = error
            if error.code == 429:                       # 너무 많이 불렀음: 서버가 알려준 시간(없으면 15초씩 늘려) 기다림
                retry_after = error.headers.get("Retry-After") if error.headers else None
                wait_s = float(retry_after) if retry_after and retry_after.isdigit() else 15 * (attempt + 1)
                time.sleep(min(wait_s, 120))
                continue
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"요청 실패({host}): {last_error}")


# ---- 게임 이름 정리 (영상 프로그램 collectors/common.py 규칙 그대로) ----
ROMAN_DIGITS = {'II': '2', 'III': '3', 'IV': '4', 'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9',
                'XI': '11', 'XII': '12', 'XIII': '13', 'XIV': '14', 'XV': '15', 'XVI': '16'}
ROMAN_RE = re.compile(r"(?<![A-Za-z0-9])(" + "|".join(sorted(ROMAN_DIGITS, key=len, reverse=True)) + r")(?![A-Za-z0-9])")


def arabic_numerals(text: str) -> str:
    return ROMAN_RE.sub(lambda m: ROMAN_DIGITS[m.group(1)], text or "")


def display_title(value: str) -> str:
    """게임 이름은 하나만: 한글 이름이 같이 적혀 있으면 한글("Palworld / 팰월드" → "팰월드"), ™/®/© 제거."""
    title = arabic_numerals(re.sub(r"\s+", " ", re.sub(r"[™®©]", "", value or "")).strip())
    trimmed = re.sub(r"\s*[぀-ヿ㐀-鿿]+(?:\s+[぀-ヿ㐀-鿿]+)*\s*$", "", title).strip()
    if trimmed and trimmed != title and re.search(r"[A-Za-z가-힣]", trimmed):
        title = trimmed
    both = re.fullmatch(r"([A-Za-z0-9][^가-힣]*[A-Za-z0-9!?.])\s+([가-힣][^A-Za-z]*)", title)
    if both:
        english, korean = both.group(1), both.group(2).strip()
        colon = re.search(r"[:：]", english) and re.search(r"[:：]", korean)
        number = re.search(r"\s(\d+)$", english)
        if (colon or (number and re.search(r"\s" + number.group(1) + r"$", korean))) and len(re.findall(r"[가-힣]", korean)) >= 3:
            return korean
    parts = [p.strip() for p in re.split(r"\s+/\s+|\s*[(（]|[)）]", title) if p and p.strip()]
    korean = [p for p in parts if re.search(r"[가-힣]", p)]
    return korean[0] if len(parts) == 2 and len(korean) == 1 else title
