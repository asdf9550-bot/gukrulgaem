"""출시 예정 신작 — 스팀 '인기 출시 예정'(찜 많은 순) + '찜 순위' 검색 결과에서 게임을 모아 출시일·예약 가격·한국어 지원을 받는다.

2026-10-17 (사용자 "신작 게임 출시일도 보여주는 페이지"): 사이트 /upcoming. 키 없는 스팀 공개 주소만 씀.
결과: data/upcoming.json {updated_at, items:[{appid, name, release_text, release_at, release_precision, price, korean_support,
                                             genres, header_image, wishlist_rank, popular_rank, platforms, short_description, steam_url}]}
"""
from __future__ import annotations

import json
import re
from datetime import date

from .common import ROOT, display_title, get_json, load_rules, now_iso
from .steam_store import APPDETAILS, korean_support

DATA = ROOT / "data"
PATH = DATA / "upcoming.json"
SEARCH = "https://store.steampowered.com/search/results/"
PAGES = 2            # 필터마다 50개 × 2 = 100개


def _ranked(filter_name: str, rules: dict) -> dict[int, int]:
    """검색 필터 결과의 appid → 순위(1부터)."""
    order: dict[int, int] = {}
    for page in range(PAGES):
        data = get_json(SEARCH, {"filter": filter_name, "category1": 998, "cc": "KR", "l": "koreana", "infinite": 1, "json": 1,
                                 "start": page * 50, "count": 50},
                        host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
        ids = [int(m) for m in re.findall(r'data-ds-appid="(\d+)"', (data or {}).get("results_html") or "")]
        if not ids:
            break
        for appid in ids:
            order.setdefault(appid, len(order) + 1)
    return order


def parse_release(text: str) -> tuple[str | None, str]:
    """스팀 출시일 글자 → (ISO 날짜 또는 None, 정밀도). '2026년 10월 22일' → day, '2026년 10월' → month, '2026년 4분기' → quarter, '2026년' → year."""
    t = (text or "").strip()
    m = re.search(r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일", t)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}", "day"
    m = re.search(r"(\d{4})년\s*(\d{1,2})월", t)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-01", "month"
    m = re.search(r"(\d{4})년\s*([1-4])분기", t) or re.search(r"Q([1-4])\s*(\d{4})", t)
    if m:
        year, q = (m.group(1), m.group(2)) if "분기" in t else (m.group(2), m.group(1))
        return f"{year}-{(int(q) - 1) * 3 + 1:02d}-01", "quarter"
    m = re.search(r"(\d{4})", t)
    if m:
        return f"{m.group(1)}-01-01", "year"
    return None, "unknown"


def _details(appid: int, rules: dict) -> dict | None:
    data = get_json(APPDETAILS, {"appids": appid, "cc": "kr", "l": "koreana"},
                    host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
    entry = (data or {}).get(str(appid)) or {}
    d = entry.get("data") if entry.get("success") else None
    if not d or d.get("type") != "game":
        return None
    rel = d.get("release_date") or {}
    if not rel.get("coming_soon"):
        return None                         # 이미 나온 게임은 할인 목록 쪽 몫
    release_at, precision = parse_release(rel.get("date") or "")
    po = d.get("price_overview")
    price = int(round(po["final"] / 100)) if po and po.get("currency") == "KRW" else (0 if d.get("is_free") else None)
    plat = d.get("platforms") or {}
    return {
        "appid": appid, "name": display_title(d.get("name", "")),
        "release_text": rel.get("date") or "", "release_at": release_at, "release_precision": precision,
        "price": price, "korean_support": korean_support(d.get("supported_languages", "")),
        "genres": [g.get("description", "") for g in d.get("genres", []) if g.get("description")],
        "header_image": d.get("header_image"), "platforms": [k for k in ("windows", "mac", "linux") if plat.get(k)],
        "short_description": re.sub(r"<[^>]+>", "", d.get("short_description") or "").strip() or None,
        "developers": (d.get("developers") or [])[:2],
        "steam_url": f"https://store.steampowered.com/app/{appid}/",
    }


RECENT_DAYS = 45
REVIEWS = "https://store.steampowered.com/appreviews/{appid}"


def _recent(rules: dict, log=print, limit: int = 40) -> list[dict]:
    """최근 출시작(2026-10-17 사용자 "최근 출시작도"): 판매 순 차트 400개 중 45일 안에 나온 게임. 평가(전체 리뷰 수·긍정률)도 같이."""
    today = date.today()
    rows: list[dict] = []
    for start in range(0, 400, 50):
        data = get_json(SEARCH, {"filter": "topsellers", "category1": 998, "cc": "KR", "l": "koreana", "infinite": 1, "json": 1, "start": start, "count": 50},
                        host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
        html = (data or {}).get("results_html") or ""
        for m in re.finditer(r'data-ds-appid="(\d+)"[\s\S]*?search_released[^>]*>\s*([^<]*?)\s*<', html):
            d = re.search(r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일", m.group(2))
            if not d:
                continue
            released = date(int(d.group(1)), int(d.group(2)), int(d.group(3)))
            if 0 <= (today - released).days <= RECENT_DAYS:
                rows.append({"appid": int(m.group(1)), "release_at": released.isoformat(), "sales_rank": len(rows) + 1 + start * 0})
        if len(rows) >= limit:
            break
    seen, out = set(), []
    for r in rows:
        if r["appid"] in seen:
            continue
        seen.add(r["appid"])
        try:
            data = get_json(APPDETAILS, {"appids": r["appid"], "cc": "kr", "l": "koreana"},
                            host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
            d = ((data or {}).get(str(r["appid"])) or {}).get("data")
            if not d or d.get("type") != "game":
                continue
            rv = get_json(REVIEWS.format(appid=r["appid"]), {"json": 1, "language": "all", "purchase_type": "all", "num_per_page": 0},
                          host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
            s = (rv or {}).get("query_summary") or {}
            po = d.get("price_overview")
            plat = d.get("platforms") or {}
            out.append({
                "appid": r["appid"], "name": display_title(d.get("name", "")), "release_at": r["release_at"], "sales_rank": len(out) + 1,
                "price": int(round(po["final"] / 100)) if po and po.get("currency") == "KRW" else (0 if d.get("is_free") else None),
                "regular_price": int(round(po["initial"] / 100)) if po and po.get("currency") == "KRW" else None,
                "discount_pct": int((po or {}).get("discount_percent") or 0),
                "korean_support": korean_support(d.get("supported_languages", "")),
                "genres": [g.get("description", "") for g in d.get("genres", []) if g.get("description")],
                "header_image": d.get("header_image"), "platforms": [k for k in ("windows", "mac", "linux") if plat.get(k)],
                "reviews_all": int(s.get("total_reviews") or 0), "positive_all": int(s.get("total_positive") or 0),
                "review_desc": s.get("review_score_desc"),
                "steam_url": f"https://store.steampowered.com/app/{r['appid']}/",
            })
        except Exception as error:
            log(f"  최근 출시 {r['appid']} 실패: {str(error)[:100]}")
        if len(out) >= limit:
            break
    return out


def run(log=print, limit: int = 120) -> dict:
    rules = load_rules()
    popular = _ranked("popularcomingsoon", rules)
    wishlist = _ranked("popularwishlist", rules)
    # 찜 순위(기대작) 100개를 먼저, '인기 출시 예정'은 상위 30개만 보탬 — 후자는 이번 주 나오는 작은 인디가 대부분이라(2026-10-17 확인)
    ids = list(wishlist)
    for appid in list(popular)[:30]:
        if appid not in wishlist:
            ids.append(appid)
    items, failed = [], 0
    for appid in ids[:limit]:
        try:
            row = _details(appid, rules)
        except Exception as error:
            failed += 1
            log(f"  신작 {appid} 실패: {str(error)[:100]}")
            continue
        if row:
            row["popular_rank"] = popular.get(appid)
            row["wishlist_rank"] = wishlist.get(appid)
            items.append(row)
    today = date.today().isoformat()
    items = [i for i in items if not (i["release_at"] and i["release_precision"] == "day" and i["release_at"] < today)]
    items.sort(key=lambda i: (i["release_at"] or "9999", i["wishlist_rank"] or 999, i["popular_rank"] or 999))
    recent = _recent(rules, log)
    DATA.mkdir(exist_ok=True)
    PATH.write_text(json.dumps({"updated_at": now_iso(), "items": items, "recent": recent}, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"items": len(items), "recent": len(recent), "failed": failed, "popular": len(popular), "wishlist": len(wishlist)}


if __name__ == "__main__":
    print(run())
