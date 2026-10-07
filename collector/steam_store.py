"""스팀 상점(appdetails, 비공식): 현재가·정가·할인율·장르·한국어 지원·대표 그림.
cc=kr, l=koreana 로 호출한다. 호출 제한이 있어 요청 사이에 간격을 둔다."""
from __future__ import annotations

import re

from .common import display_title, get_json, load_rules

APPDETAILS = "https://store.steampowered.com/api/appdetails"
FEATURED = "https://store.steampowered.com/api/featuredcategories/"


def korean_support(supported_languages_html: str) -> str:
    """스팀의 '지원 언어' 문자열에서 한국어 지원 정도를 읽는다.
    '한국어<strong>*</strong>'(별표) = 음성까지 → voice_sub, 별표 없이 '한국어' → sub(자막만), 없으면 none."""
    text = supported_languages_html or ""
    match = re.search(r"(한국어|Korean)\s*(<strong>\s*\*\s*</strong>|\*)?", text)
    if not match:
        return "none"
    return "voice_sub" if match.group(2) else "sub"


def _price(overview: dict | None, is_free: bool) -> dict:
    if is_free:
        return {"regular_price": 0, "current_price": 0, "discount_pct": 0}
    if not overview or overview.get("currency") != "KRW":
        return {"regular_price": None, "current_price": None, "discount_pct": None}
    # 스팀은 원화도 100배로 돌려준다(2590000 → 25,900원).
    return {"regular_price": int(round(overview["initial"] / 100)),
            "current_price": int(round(overview["final"] / 100)),
            "discount_pct": int(overview.get("discount_percent") or 0)}


def appdetails(appid: int, rules: dict | None = None) -> dict | None:
    """한 게임의 상점 정보. 상점에 없거나 응답이 비정상이면 None."""
    rules = rules or load_rules()
    data = get_json(APPDETAILS, {"appids": appid, "cc": "kr", "l": "koreana"},
                    host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
    entry = (data or {}).get(str(appid)) or {}
    if not entry.get("success") or not entry.get("data"):
        return None
    d = entry["data"]
    if d.get("type") != "game":
        return None
    row = {
        "appid": appid,
        "name": display_title(d.get("name", "")),
        "name_raw": d.get("name", ""),
        "genres": [g.get("description", "") for g in d.get("genres", []) if g.get("description")],
        "korean_support": korean_support(d.get("supported_languages", "")),
        "header_image": d.get("header_image"),
        "release_date": (d.get("release_date") or {}).get("date"),
        "steam_url": f"https://store.steampowered.com/app/{appid}/",
    }
    row.update(_price(d.get("price_overview"), bool(d.get("is_free"))))
    plat = d.get("platforms") or {}
    row["platforms"] = [k for k in ("windows", "mac", "linux") if plat.get(k)]
    cats = {c.get("id") for c in d.get("categories") or []}
    # 스팀 카테고리 번호: 2 싱글, 1 멀티, 9 협동, 38 온라인 협동, 36 온라인 PvP, 49 PvP, 28 패드 완전 지원, 18 패드 일부 지원
    row["play_modes"] = [m for m, ids in (("single", {2}), ("multi", {1, 36, 49}), ("coop", {9, 38})) if cats & ids]
    row["controller"] = "full" if 28 in cats else "partial" if 18 in cats else "none"
    row["editions"] = editions(d)
    row["capsule_image"] = d.get("capsule_image")          # 616×353
    row["hero_image"] = hero_image_url(appid)              # 3840×1240, 없으면 None
    row["required_age"] = int(str(d.get("required_age") or 0).strip("+") or 0)
    row["content_descriptors"] = [int(x) for x in ((d.get("content_descriptors") or {}).get("ids") or [])]
    return row


def editions(d: dict) -> list[dict]:
    """스팀 상점의 '패키지 묶음'(package_groups)에서 판별 가격: [{name, price, regular, cut, packageid}].
    option_text 예: 'Cyberpunk 2077: Ultimate Edition - ₩49,800'. 가격은 원화×100으로 온다."""
    out = []
    for group in d.get("package_groups") or []:
        if group.get("name") != "default":
            continue
        for sub in group.get("subs") or []:
            if sub.get("is_free_license"):
                continue
            cents = sub.get("price_in_cents_with_discount")
            if cents is None:
                continue
            price = int(round(cents / 100))
            m = re.search(r"-?\s*(\d+)\s*%", sub.get("percent_savings_text") or "")
            cut = int(m.group(1)) if m else 0
            raw = sub.get("option_text") or ""
            orig = re.search(r'discount_original_price">\s*₩?\s*([\d,]+)', raw)          # 정가는 취소선 조각에서
            plain = re.sub(r"<[^>]+>", " ", raw)
            name = re.split(r"\s+-\s+(?=₩|\d)", plain, maxsplit=1)[0].strip()          # ' - ₩ 66,000 ₩ 19,800' 앞까지
            regular = int(orig.group(1).replace(",", "")) if orig else (int(round(price / (1 - cut / 100) / 100.0)) * 100 if cut else price)
            out.append({"name": display_title(name), "price": price, "regular": regular, "cut": cut, "packageid": sub.get("packageid")})
    return out


HERO = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg"


def hero_image_url(appid: int) -> str | None:
    """스팀 라이브러리용 큰 가로 그림 주소. 없는 게임도 있어 HEAD로 확인한다(CDN이라 간격 짧게)."""
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError, URLError
    import time
    url = HERO.format(appid=appid)
    try:
        time.sleep(0.2)
        with urlopen(Request(url, method="HEAD", headers={"User-Agent": "steam-buy-guide/0.1"}), timeout=10) as r:
            return url if r.status == 200 else None
    except (HTTPError, URLError, TimeoutError):
        return None


def adult_reason(row: dict, rules: dict) -> str | None:
    """빼야 할 성인 게임이면 이유 문자열, 아니면 None."""
    hit = sorted(set(row.get("content_descriptors") or []) & set(rules.get("exclude_content_descriptors") or []))
    if hit:
        names = {3: "성인 전용 성적 내용", 4: "잦은 노출·성적 내용", 1: "일부 노출", 2: "잦은 폭력", 5: "일반 성인"}
        return "성인 표시: " + ", ".join(names.get(h, str(h)) for h in hit)
    return None


SEARCH = "https://store.steampowered.com/search/results/"


def search_specials(limit: int = 120, rules: dict | None = None) -> list[int]:
    """스팀 검색 '특별 할인 · 판매 순'에서 할인 중인 게임(DLC·묶음 제외) 앱 번호를 limit 개까지."""
    rules = rules or load_rules()
    found: list[int] = []
    start = 0
    while len(found) < limit:
        data = get_json(SEARCH, {"specials": 1, "filter": "topsellers", "category1": 998, "cc": "KR", "l": "koreana",
                                 "infinite": 1, "json": 1, "start": start, "count": 50},
                        host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
        html = (data or {}).get("results_html") or ""
        ids = [int(m) for m in re.findall(r'data-ds-appid="(\d+)"', html)]
        if not ids:
            break
        for appid in ids:
            if appid not in found:
                found.append(appid)
        start += 50
        if start >= int((data or {}).get("total_count") or 0):
            break
    return found[:limit]


def discounted_appids(limit: int = 100, rules: dict | None = None) -> list[int]:
    """지금 할인 중인 게임 앱 번호 목록. 검색(판매 순)을 먼저 쓰고, 안 되면 '특별 할인' 모음으로."""
    rules = rules or load_rules()
    try:
        ids = search_specials(limit, rules)
        if ids:
            return ids
    except Exception:
        pass
    data = get_json(FEATURED, {"cc": "kr", "l": "koreana"},
                    host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
    seen: list[int] = []
    for key in ("specials", "top_sellers", "new_releases"):
        for item in ((data or {}).get(key) or {}).get("items") or []:
            appid = item.get("id")
            if item.get("discounted") and item.get("type") == 0 and appid and appid not in seen:
                seen.append(int(appid))
    return seen[:limit]
