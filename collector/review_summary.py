"""한국어 부정 리뷰 요약 — "한국인이 싫어한 이유 3줄" (Claude Haiku, 게임당 주 1회, 결과 캐시).

비용: 게임당 리뷰 20개 ≈ 3천 토큰 → 약 0.3센트. 120개면 주 40센트 안팎.
키: .env 의 ANTHROPIC_API_KEY (없으면 조용히 건너뜀). 결과: data/review_summaries.json
[{appid, week, reasons:[3개], summary, sample, model, created_at}]
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from . import steam_reviews
from .common import ROOT, env, load_rules, now_iso

DATA = ROOT / "data"
PATH = DATA / "review_summaries.json"
MODEL = "claude-haiku-4-5-20251001"
MIN_NEGATIVE = 8          # 부정 리뷰가 이보다 적으면 요약하지 않음

PROMPT = """아래는 스팀 게임 "{name}"의 한국어 부정(비추천) 리뷰 {n}개입니다.
한국 게이머들이 이 게임을 싫어한 이유를 리뷰에 실제로 나온 내용만으로 정리하세요. 추측·일반론 금지, 욕설 그대로 옮기지 않기.

JSON 하나만 출력:
{{"reasons": ["이유 1 (25자 이내)", "이유 2", "이유 3"], "summary": "한 문장 요약 (60자 이내, 존댓말)"}}

리뷰:
{reviews}"""


def _load() -> list[dict]:
    return json.loads(PATH.read_text(encoding="utf-8")) if PATH.is_file() else []


def _save(rows: list[dict]) -> None:
    DATA.mkdir(exist_ok=True)
    PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def _ask(name: str, reviews: list[str], key: str) -> dict | None:
    body = {"model": MODEL, "max_tokens": 400, "temperature": 0.2,
            "messages": [{"role": "user", "content": PROMPT.format(name=name, n=len(reviews), reviews="\n".join(f"- {r[:400]}" for r in reviews))}]}
    req = Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode("utf-8"), method="POST",
                  headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
    try:
        with urlopen(req, timeout=60) as r:
            out = json.loads(r.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"Claude HTTP {error.code}: {error.read()[:200]!r}") from None
    text = "".join(block.get("text", "") for block in out.get("content", []) if block.get("type") == "text")
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    data = json.loads(m.group(0))
    reasons = [str(x).strip()[:40] for x in (data.get("reasons") or []) if str(x).strip()][:3]
    if len(reasons) < 2:
        return None
    usage = out.get("usage") or {}
    return {"reasons": reasons, "summary": str(data.get("summary") or "").strip()[:80],
            "tokens": {"in": usage.get("input_tokens"), "out": usage.get("output_tokens")}}


def summarize(games: list[dict], rules: dict | None = None, log=print, limit: int | None = None) -> dict:
    """한국어 리뷰가 충분한 게임만, 이번 주 캐시가 없으면 요약. 요약 결과 수를 돌려준다."""
    rules = rules or load_rules()
    key = env("ANTHROPIC_API_KEY")
    if not key:
        log("  리뷰 요약: ANTHROPIC_API_KEY 없음 → 건너뜀")
        return {"done": 0, "skipped": len(games)}
    week = datetime.now(timezone.utc).strftime("%G-W%V")
    rows = _load()
    have = {(r["appid"], r["week"]) for r in rows}
    done = skipped = failed = 0
    for g in games:
        if limit and done >= limit:
            break
        if (g["appid"], week) in have or g.get("reviews_ko", 0) < 100:
            skipped += 1
            continue
        try:
            negatives = steam_reviews.korean_negative_reviews(g["appid"], 20, rules)
            negatives = [t for t in negatives if len(t) >= 20]
            if len(negatives) < MIN_NEGATIVE:
                skipped += 1
                continue
            result = _ask(g["name"], negatives, key)
            if not result:
                failed += 1
                continue
            rows = [r for r in rows if not (r["appid"] == g["appid"] and r["week"] == week)]
            rows.append({"appid": g["appid"], "week": week, "reasons": result["reasons"], "summary": result["summary"],
                         "sample": len(negatives), "model": MODEL, "tokens": result["tokens"], "created_at": now_iso()})
            done += 1
            log(f"  요약 {g['name']}: {' / '.join(result['reasons'])}")
            if done % 5 == 0:
                _save(rows)
        except Exception as error:
            failed += 1
            log(f"  요약 실패 {g.get('name')}: {str(error)[:120]}")
            if failed >= 3 and done == 0:
                log("  연속 실패 → 중단")
                break
    # 오래된 주 기록은 게임당 최근 8주만
    keep: dict[int, list[dict]] = {}
    for r in sorted(rows, key=lambda r: r["week"]):
        keep.setdefault(r["appid"], []).append(r)
    rows = [r for lst in keep.values() for r in lst[-8:]]
    _save(rows)
    return {"done": done, "skipped": skipped, "failed": failed}
