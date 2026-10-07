"""한국어 리뷰 요약 — "한국인이 좋아한 이유 5줄 / 싫어한 이유 5줄" (Claude Haiku, 게임당 주 1회, 결과 캐시).

비용: 게임당 리뷰 20개 × 2(추천·비추천) ≈ 6천 토큰 → 약 0.7센트. 120개면 주 1달러 안팎.
키: .env 의 ANTHROPIC_API_KEY (없으면 조용히 건너뜀). 결과: data/review_summaries.json
[{appid, week, reasons:[싫어한 이유 3], summary, sample, likes:[좋아한 이유 3], likes_summary, likes_sample, model, created_at}]
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
MIN_SAMPLE = 8          # 리뷰가 이보다 적으면 요약하지 않음

PROMPTS = {
    "negative": """아래는 스팀 게임 "{name}"의 한국어 부정(비추천) 리뷰 {n}개입니다.
한국 게이머들이 이 게임을 싫어한 이유를 리뷰에 실제로 나온 내용만으로 5가지 정리하세요(많이 언급된 순). 추측·일반론 금지, 욕설 그대로 옮기지 않기.

JSON 하나만 출력:
{{"reasons": ["이유 1 (25자 이내)", "이유 2", "이유 3", "이유 4", "이유 5"], "summary": "한 문장 요약 (60자 이내, 존댓말)"}}

리뷰:
{reviews}""",
    "positive": """아래는 스팀 게임 "{name}"의 한국어 긍정(추천) 리뷰 {n}개입니다.
한국 게이머들이 이 게임을 좋아한 이유를 리뷰에 실제로 나온 내용만으로 5가지 정리하세요(많이 언급된 순). 추측·일반론·광고 문구 금지, 욕설 그대로 옮기지 않기.

JSON 하나만 출력:
{{"reasons": ["이유 1 (25자 이내)", "이유 2", "이유 3", "이유 4", "이유 5"], "summary": "한 문장 요약 (60자 이내, 존댓말)"}}

리뷰:
{reviews}""",
}


def _load() -> list[dict]:
    return json.loads(PATH.read_text(encoding="utf-8")) if PATH.is_file() else []


def _save(rows: list[dict]) -> None:
    DATA.mkdir(exist_ok=True)
    PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def _ask(kind: str, name: str, reviews: list[str], key: str) -> dict | None:
    body = {"model": MODEL, "max_tokens": 600, "temperature": 0.2,
            "messages": [{"role": "user", "content": PROMPTS[kind].format(name=name, n=len(reviews), reviews="\n".join(f"- {r[:400]}" for r in reviews))}]}
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
    reasons = [str(x).strip()[:40] for x in (data.get("reasons") or []) if str(x).strip()][:5]
    if len(reasons) < 3:
        return None
    usage = out.get("usage") or {}
    return {"reasons": reasons, "summary": str(data.get("summary") or "").strip()[:80],
            "tokens": {"in": usage.get("input_tokens"), "out": usage.get("output_tokens")}}


def _one(kind: str, g: dict, key: str, rules: dict) -> dict | None:
    reviews = [t for t in steam_reviews.korean_reviews_by_type(g["appid"], kind, 20, rules) if len(t) >= 20]
    if len(reviews) < MIN_SAMPLE:
        return None
    result = _ask(kind, g["name"], reviews, key)
    if not result:
        return None
    result["sample"] = len(reviews)
    return result


def summarize(games: list[dict], rules: dict | None = None, log=print, limit: int | None = None) -> dict:
    """한국어 리뷰가 충분한 게임만, 이번 주 캐시에 없는 쪽(싫어한/좋아한)만 요약."""
    rules = rules or load_rules()
    key = env("ANTHROPIC_API_KEY")
    if not key:
        log("  리뷰 요약: ANTHROPIC_API_KEY 없음 → 건너뜀")
        return {"done": 0, "skipped": len(games)}
    week = datetime.now(timezone.utc).strftime("%G-W%V")
    rows = _load()
    byweek = {(r["appid"], r["week"]): r for r in rows}
    done = skipped = failed = 0
    for g in games:
        if limit and done >= limit:
            break
        if g.get("reviews_ko", 0) < 100:
            skipped += 1
            continue
        row = byweek.get((g["appid"], week))
        need_neg = not row or not row.get("reasons")
        need_pos = not row or not row.get("likes")
        if not need_neg and not need_pos:
            skipped += 1
            continue
        try:
            row = row or {"appid": g["appid"], "week": week, "model": MODEL, "created_at": now_iso(), "tokens": {"in": 0, "out": 0}}
            changed = False
            if need_neg:
                r = _one("negative", g, key, rules)
                if r:
                    row.update({"reasons": r["reasons"], "summary": r["summary"], "sample": r["sample"]}); changed = True
                    row["tokens"] = {"in": (row["tokens"].get("in") or 0) + (r["tokens"]["in"] or 0), "out": (row["tokens"].get("out") or 0) + (r["tokens"]["out"] or 0)}
            if need_pos:
                r = _one("positive", g, key, rules)
                if r:
                    row.update({"likes": r["reasons"], "likes_summary": r["summary"], "likes_sample": r["sample"]}); changed = True
                    row["tokens"] = {"in": (row["tokens"].get("in") or 0) + (r["tokens"]["in"] or 0), "out": (row["tokens"].get("out") or 0) + (r["tokens"]["out"] or 0)}
            if not changed:
                failed += 1
                continue
            row["created_at"] = now_iso()
            byweek[(g["appid"], week)] = row
            rows = [x for x in rows if not (x["appid"] == g["appid"] and x["week"] == week)] + [row]
            done += 1
            log(f"  요약 {g['name']}: 좋아함 {' / '.join(row.get('likes') or [])} | 싫어함 {' / '.join(row.get('reasons') or [])}")
            if done % 5 == 0:
                _save(rows)
        except Exception as error:
            failed += 1
            log(f"  요약 실패 {g.get('name')}: {str(error)[:120]}")
            if failed >= 3 and done == 0:
                log("  연속 실패 → 중단")
                break
    keep: dict[int, list[dict]] = {}
    for r in sorted(rows, key=lambda r: r["week"]):
        keep.setdefault(r["appid"], []).append(r)
    rows = [r for lst in keep.values() for r in lst[-8:]]
    _save(rows)
    return {"done": done, "skipped": skipped, "failed": failed}
