"""다이렉트 게임즈(directg.net) 가격 수집 — B안(2026-10-06 사용자 결정).

규칙: 사이트맵(robots.txt가 공개한 것)만 쓴다. 가격·제목·주소·에디션·한국어 표시만 저장하고
이미지·설명은 저장하지 않는다. 하루 1회, 요청 간격 3초, 봇 이름에 연락처. 중단 요청이 오면 끈다.
실패해도 마지막 성공 캐시(data/directg_cache.json)로 화면을 만든다.

게임 연결: 상품 페이지의 스팀 그림 주소에 있는 앱 번호가 우리 목록에 있으면 연결(link),
없으면 정규화한 제목이 정확히 하나와 같을 때만 연결(title). 그 외는 match_queue.json(확인 대기).
에디션(디럭스·얼티밋·DLC 등)은 일반판 앱 번호에 연결하지 않는다.
"""
from __future__ import annotations

import difflib
import json
import re
import time
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .common import ROOT, display_title, load_rules, now_iso

SITEMAP = "https://directg.net/sitemap_game.php"
UA = "gukrulgem-bot/0.1 (+asdfpil0001@gmail.com; Korean price comparison; 1 visit/day)"
STORE_ID = "directg"
STORE_NAME = "다이렉트 게임즈"
DATA = ROOT / "data"
CACHE = DATA / "directg_cache.json"
QUEUE = DATA / "match_queue.json"
EDITION_WORDS = ["디럭스", "deluxe", "얼티밋", "ultimate", "골드", "gold", "프리미엄", "premium", "시즌 패스", "season pass",
                 "dlc", "확장팩", "expansion", "번들", "bundle", "컬렉션", "collection", "완전판", "complete", "에디션", "edition",
                 "업그레이드", "upgrade", "팩", "pack", "사운드트랙", "soundtrack"]

_last = 0.0


def _get(url: str, interval: float, timeout: int = 25) -> str:
    global _last
    wait = interval - (time.monotonic() - _last)
    if wait > 0:
        time.sleep(wait)
    _last = time.monotonic()
    with urlopen(Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"}), timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def product_ids(interval: float = 3.0) -> list[str]:
    """사이트맵의 상품 번호 목록."""
    xml = _get(SITEMAP, interval)
    return re.findall(r"product_id=([0-9a-f-]{36})", xml)


def _won(text: str) -> int | None:
    m = re.search(r"\d{1,3}(?:,\d{3})+|\d+", text or "")
    return int(m.group(0).replace(",", "")) if m else None


def _cards(section_html: str) -> list[dict]:
    """한 섹션 안의 상품 카드들: 이름, 할인율, 정가, 현재가, sku."""
    out = []
    for card in re.split(r'<div class="card p-0 mb-0">', section_html)[1:]:
        name = re.search(r'<h5 class="card-title[^"]*">(.*?)</h5>', card, re.S)
        cur = re.search(r'current-price[^>]*>\s*([\d,]+)', card)
        old = re.search(r'old-price[^>]*>\s*([\d,]+)', card)
        cut = re.search(r'class="[^"]*minus[^"]*">\s*(\d+)\s*%', card)
        sku = re.search(r'btn_cart"[^>]*data-sku="([^"]+)"', card)
        if not name or not cur:
            continue
        out.append({"name": unescape(re.sub(r"<[^>]+>", "", name.group(1))).strip(), "price": _won(cur.group(1)),
                    "regular": _won(old.group(1)) if old else _won(cur.group(1)),
                    "cut": int(cut.group(1)) if cut else 0, "sku": sku.group(1) if sku else None})
    return out


def parse(html: str, product_id: str) -> dict:
    """상품 페이지 → {title, base:[...], editions:[...], appid_hint, region_lock, korean, platform}."""
    title = re.search(r'<meta property="og:title" content="([^"]*)"', html)
    sections = dict(re.findall(r'<div class="section-title">([^<]+)</div>(.*?)(?=<div class="section-title">|<footer|$)', html, re.S))
    hint = re.search(r"steamstatic\.com/store_item_assets/steam/apps/(\d+)/", html)
    lang_block = re.search(r"언어지원</(?:span|div)>(.{0,800})", html, re.S)
    lang = re.sub(r"<[^>]+>", " ", lang_block.group(1)) if lang_block else ""
    return {
        "product_id": product_id,
        "url": f"https://directg.net/game/game_view.html?product_id={product_id}",
        "title": unescape(title.group(1)).strip() if title else "",
        "base": _cards(sections.get("기본게임", "")),
        "editions": _cards(sections.get("에디션", "")) + _cards(sections.get("DLC", "")),
        "appid_hint": int(hint.group(1)) if hint else None,
        "region_lock": "kr" if "대한민국 외 국가" in html else "unknown",
        "korean": {"subtitle": "자막" in lang, "voice": "음성" in lang, "exclusive": "독점" in lang},
        "platform": "steam" if "platform/steam.svg" in html else "other",
        "fetched_at": now_iso(),
    }


def load_cache() -> dict:
    return json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.is_file() else {"fetched_date": None, "products": {}}


def save_cache(cache: dict) -> None:
    DATA.mkdir(exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")


LINKS = DATA / "directg_links.json"      # 관리자가 붙여 넣은 상품 주소: [{"appid": 123, "product_id": "...", "added_at": ...}]


def manual_links() -> list[dict]:
    return json.loads(LINKS.read_text(encoding="utf-8")) if LINKS.is_file() else []


def collect(limit: int | None = None, force: bool = False, rules: dict | None = None, log=print) -> dict:
    """상품을 받아 캐시에 저장. 오늘 이미 받았으면(하루 1회) 캐시를 그대로 쓴다.
    대상 = 사이트맵(봇 이름으로는 홈 화면만 와서 보통 36개쯤) + 관리자가 붙여 넣은 상품 주소."""
    rules = rules or load_rules()
    interval = float(rules.get("directg_request_interval_sec", 3.0))
    cache = load_cache()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if cache.get("fetched_date") == today and not force:
        log(f"  다이렉트 게임즈: 오늘({today}) 이미 받음 → 캐시 사용 ({len(cache['products'])}개)")
        return cache
    ids = product_ids(interval)
    for link in manual_links():
        if link.get("product_id") and link["product_id"] not in ids:
            ids.append(link["product_id"])
    if limit:
        ids = ids[:limit]
    log(f"  다이렉트 게임즈: 상품 {len(ids)}개, 간격 {interval}초")
    ok = fail = 0
    for i, pid in enumerate(ids, 1):
        try:
            html = _get(f"https://directg.net/game/game_view.html?product_id={pid}", interval)
            cache["products"][pid] = parse(html, pid)
            ok += 1
        except (HTTPError, URLError, TimeoutError) as error:
            fail += 1
            log(f"  [{i}/{len(ids)}] {pid} 실패: {str(error)[:80]}")
            if fail >= 10 and ok == 0:
                log("  연속 실패 → 중단(캐시 유지)")
                break
        if i % 25 == 0:
            log(f"  [{i}/{len(ids)}] 받는 중… 성공 {ok}, 실패 {fail}")
            save_cache(cache)
    if ok:
        cache["fetched_date"] = today
    cache["last_run"] = {"at": now_iso(), "ok": ok, "fail": fail, "limit": limit}
    save_cache(cache)
    return cache


# ---- 게임 연결 ----
def norm(text: str) -> str:
    t = display_title(text or "").lower()
    t = re.sub(r"[™®©:：\-–—_'’\"!?,.·&/()\[\]【】]", " ", t)
    t = re.sub(r"\s+", "", t)
    return t


def is_edition(name: str) -> bool:
    low = name.lower()
    return any(w in low for w in EDITION_WORDS)


def match(products: dict, games: list[dict], rules: dict | None = None) -> tuple[list[dict], list[dict]]:
    """(offers 행, 확인 대기 행). 일반판(base) 카드만 연결한다."""
    rules = rules or load_rules()
    by_appid = {g["appid"]: g for g in games}
    manual = {l["product_id"]: l["appid"] for l in manual_links() if l.get("appid") in by_appid}
    by_norm: dict[str, list[int]] = {}
    for g in games:
        by_norm.setdefault(norm(g["name"]), []).append(g["appid"])
    names = {norm(g["name"]): g["appid"] for g in games}
    offers, queue = [], []
    for p in products.values():
        base = next((c for c in p.get("base", []) if c.get("price")), None)
        if not base or p.get("platform") != "steam":
            continue
        appid, how = None, None
        if p["product_id"] in manual:
            appid, how = manual[p["product_id"]], "manual"
        elif p.get("appid_hint") in by_appid:
            appid, how = p["appid_hint"], "link"
        elif not is_edition(base["name"]) or is_edition(p.get("title", "")) is False:
            key = norm(base["name"]) or norm(p["title"])
            hits = by_norm.get(key, [])
            if len(hits) == 1:
                appid, how = hits[0], "title"
        if appid is None:
            key = norm(base["name"]) or norm(p["title"])
            cands = difflib.get_close_matches(key, list(names), n=5, cutoff=0.6)
            if cands:
                queue.append({"id": f"{STORE_ID}:{p['product_id']}", "store_id": STORE_ID, "product_id": p["product_id"],
                              "product_url": p["url"], "title_raw": base["name"], "edition": "edition" if is_edition(base["name"]) else "standard",
                              "price": base["price"], "candidates": [{"appid": names[c], "name": by_appid[names[c]]["name"],
                                                                      "score": round(difflib.SequenceMatcher(None, key, c).ratio(), 2)} for c in cands],
                              "status": "pending", "appid": None, "decided_at": None})
            continue
        if how != "manual" and is_edition(base["name"]) and not is_edition(by_appid[appid]["name"]):
            continue        # 에디션을 일반판에 붙이지 않음(관리자가 직접 붙인 건 예외)
        offers.append({
            "appid": appid, "store_id": STORE_ID, "store_name": STORE_NAME,
            "price_original": base["price"], "currency": "KRW", "converted_by": None,
            "regular_original": base["regular"], "discount_pct": base["cut"],
            "price_krw": base["price"], "is_estimate": False,
            "product_url": p["url"], "affiliate": None,
            "drm": ["Steam"], "region_lock": p.get("region_lock", "unknown"),
            "korean_only_here": bool((p.get("korean") or {}).get("exclusive")),
            "sale_end_at": None, "fetched_at": p.get("fetched_at"), "matched_by": how,
            "editions": [{"name": e["name"], "price": e["price"], "regular": e.get("regular"), "cut": e["cut"]} for e in p.get("editions", [])],
        })
    return offers, queue


def apply_decisions(queue: list[dict]) -> list[dict]:
    """이전 승인/거절 결정을 새 대기 목록에 이어 붙인다(같은 id)."""
    old = {q["id"]: q for q in (json.loads(QUEUE.read_text(encoding="utf-8")) if QUEUE.is_file() else [])}
    for q in queue:
        prev = old.get(q["id"])
        if prev and prev.get("status") in ("approved", "rejected"):
            q.update({"status": prev["status"], "appid": prev.get("appid"), "decided_at": prev.get("decided_at")})
    return queue


def run(games: list[dict], rules: dict | None = None, limit: int | None = None, force: bool = False, log=print) -> dict:
    """전체: 수집(캐시) → 연결 → offers.json 에 다이렉트 게임즈 행 합치기, match_queue.json 저장."""
    from . import stores
    rules = rules or load_rules()
    cache = collect(limit=limit, force=force, rules=rules, log=log)
    offers, queue = match(cache["products"], games, rules)
    queue = apply_decisions(queue)
    # 승인된 대기 항목은 바로 연결
    by_pid = {p["product_id"]: p for p in cache["products"].values()}
    for q in queue:
        if q["status"] == "approved" and q.get("appid") and q["product_id"] in by_pid:
            p = by_pid[q["product_id"]]; base = next((c for c in p["base"] if c.get("price")), None)
            if base:
                offers.append({"appid": q["appid"], "store_id": STORE_ID, "store_name": STORE_NAME, "price_original": base["price"],
                               "currency": "KRW", "converted_by": None, "regular_original": base["regular"], "discount_pct": base["cut"],
                               "price_krw": base["price"], "is_estimate": False, "product_url": p["url"], "affiliate": None, "drm": ["Steam"],
                               "region_lock": p.get("region_lock", "unknown"), "korean_only_here": bool((p.get("korean") or {}).get("exclusive")),
                               "sale_end_at": None, "fetched_at": p.get("fetched_at"), "matched_by": "manual", "editions": []})
    existing = [o for o in stores._read("offers") if o.get("store_id") != STORE_ID]
    stores._write("offers", existing + offers)
    stores._write("stores", stores.load_stores())
    stores._write("offer_history", stores.update_history(offers))
    QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"products": len(cache["products"]), "offers": len(offers), "pending": sum(q["status"] == "pending" for q in queue),
            "by": {k: sum(o["matched_by"] == k for o in offers) for k in ("link", "title", "manual")}}
