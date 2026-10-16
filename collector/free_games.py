"""지금 무료인 게임 — 에픽게임즈 주간 무료(공개 API, 키 없음) + 스팀 100% 할인(이미 수집한 prices.json).

2026-10-16 (경쟁 사이트 비교: IsThereAnyDeal 첫 화면 절반이 무료·증정, 경쟁 유튜브 제목마다 "무료 게임 3개"):
홈 "지금 공짜" 칸과 영상 제목용. 결과: data/free_games.json
[{source, title, status: now|upcoming, start, end, url, image, regular_price_krw}]
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from urllib.request import Request, urlopen

from .common import ROOT, now_iso

DATA = ROOT / "data"
PATH = DATA / "free_games.json"
EPIC = "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=ko&country=KR&allowCountries=KR"


def _epic() -> list[dict]:
    with urlopen(Request(EPIC, headers={"User-Agent": "gukrulgaem/1.0"}), timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    out = []
    for e in data["data"]["Catalog"]["searchStore"]["elements"]:
        promo = e.get("promotions") or {}
        cur = promo.get("promotionalOffers") or []
        up = promo.get("upcomingPromotionalOffers") or []
        offer = status = None
        for group, st in ((cur, "now"), (up, "upcoming")):
            for g in group:
                for o in g.get("promotionalOffers") or []:
                    if (o.get("discountSetting") or {}).get("discountPercentage") == 0:   # 0 = 100% 할인(무료)
                        offer, status = o, st
                        break
                if offer:
                    break
            if offer:
                break
        if not offer:
            continue
        mappings = (e.get("catalogNs") or {}).get("mappings") or []
        slug = mappings[0]["pageSlug"] if mappings else (e.get("productSlug") or e.get("urlSlug") or "")
        images = {i.get("type"): i.get("url") for i in e.get("keyImages") or []}
        price = ((e.get("price") or {}).get("totalPrice") or {}).get("originalPrice")
        out.append({
            "source": "epic", "title": e.get("title"), "status": status,
            "start": offer.get("startDate"), "end": offer.get("endDate"),
            "url": f"https://store.epicgames.com/ko/p/{slug}" if slug else "https://store.epicgames.com/ko/free-games",
            "image": images.get("OfferImageWide") or images.get("Thumbnail") or images.get("OfferImageTall"),
            "regular_price_krw": int(price) if isinstance(price, (int, float)) else None,   # 한국 계정 기준 원화 그대로(13300 = 13,300원)
        })
    return out


def _steam() -> list[dict]:
    """이미 수집한 할인 목록에서 100% 할인(무료 획득)인 게임."""
    prices_path, games_path = DATA / "prices.json", DATA / "games.json"
    if not prices_path.is_file() or not games_path.is_file():
        return []
    prices = json.loads(prices_path.read_text(encoding="utf-8"))
    games = {g["appid"]: g for g in json.loads(games_path.read_text(encoding="utf-8"))}
    out = []
    for p in prices:
        if p.get("discount_pct") == 100 and p["appid"] in games:
            g = games[p["appid"]]
            out.append({"source": "steam", "title": g["name"], "status": "now", "start": None, "end": p.get("sale_end_at"),
                        "url": f"https://store.steampowered.com/app/{p['appid']}/", "image": g.get("header_image"),
                        "regular_price_krw": p.get("regular_price"), "appid": p["appid"]})
    return out


def run(log=print) -> dict:
    rows: list[dict] = []
    errors = 0
    for name, fn in (("epic", _epic), ("steam", _steam)):
        try:
            rows += fn()
        except Exception as error:
            errors += 1
            log(f"  무료 게임 {name} 실패: {str(error)[:120]}")
    order = {"now": 0, "upcoming": 1}
    rows.sort(key=lambda r: (order.get(r["status"], 9), r.get("end") or ""))
    DATA.mkdir(exist_ok=True)
    PATH.write_text(json.dumps({"updated_at": now_iso(), "items": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    now = sum(1 for r in rows if r["status"] == "now")
    return {"now": now, "upcoming": len(rows) - now, "errors": errors}


if __name__ == "__main__":
    print(run())
